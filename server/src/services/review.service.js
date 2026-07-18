import * as reviewRepository from "../repositories/review.repository.js";
import * as staticAnalysisService from "./static-analysis.service.js";

const DEFAULT_LANGUAGE = "Plain text";
const extensionLanguageMap = {
    c: "C",
    cpp: "C++",
    cs: "C#",
    css: "CSS",
    go: "Go",
    html: "HTML",
    java: "Java",
    js: "JavaScript",
    jsx: "JavaScript",
    json: "JSON",
    md: "Markdown",
    php: "PHP",
    py: "Python",
    rb: "Ruby",
    rs: "Rust",
    sql: "SQL",
    ts: "TypeScript",
    tsx: "TypeScript",
    txt: DEFAULT_LANGUAGE,
    vue: "Vue",
    xml: "XML",
    yml: "YAML",
    yaml: "YAML",
};

const getLineCount = (content) => {
    if (content.length === 0) return 0;
    return content.split(/\r\n|\r|\n/).length;
};

const sanitizeFocusAreas = (focusAreas = []) => {
    if (!Array.isArray(focusAreas)) return [];

    return focusAreas
        .map((area) => (typeof area === "string" ? area.trim() : ""))
        .filter(Boolean)
        .slice(0, 10);
};

const inferLanguageFromFileName = (fileName) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extensionLanguageMap[extension] || DEFAULT_LANGUAGE;
};

const mapReview = (review) => ({
    id: review.id,
    project_id: review.project_id,
    user_id: review.user_id,
    review_type: review.review_type,
    status: review.status,
    overall_score: review.overall_score === null ? null : Number(review.overall_score),
    summary: review.summary,
    created_at: review.created_at,
});

const mapReviewSource = (source) => ({
    id: source.id,
    review_id: source.review_id,
    source_type: source.source_type,
    title: source.title,
    language: source.language,
    file_name: source.file_name,
    branch_name: source.branch_name,
    line_count: source.line_count,
    character_count: source.character_count,
    metadata: source.metadata,
    created_at: source.created_at,
});

const mapReviewFinding = (finding) => ({
    id: finding.id,
    review_id: finding.review_id,
    severity: finding.severity,
    issue: finding.issue,
    explanation: finding.explanation,
    suggested_fix: finding.suggested_fix,
    file_name: finding.file_name,
    line_number: finding.line_number,
    created_at: finding.created_at,
});

const runStaticAnalysis = async (review, sources) => {
    try {
        const analysis = await staticAnalysisService.analyzeSources(sources);
        const findings = await reviewRepository.createReviewFindings(
            analysis.findings.map((finding) => ({
                review_id: review.id,
                severity: finding.severity,
                issue: finding.issue,
                explanation: finding.explanation,
                suggested_fix: finding.suggested_fix,
                file_name: finding.file_name,
                line_number: finding.line_number,
            }))
        );
        const updatedReview = await reviewRepository.updateReview(review.id, {
            status: "completed",
            overall_score: analysis.overallScore,
            summary: analysis.summary,
        });

        return {
            review: updatedReview,
            findings,
        };
    } catch (error) {
        console.error("Static analysis failed", error);
        const failedReview = await reviewRepository
            .updateReview(review.id, {
                status: "failed",
                summary: `Static analysis failed: ${error.message || "Unknown analyzer error"}`,
            })
            .catch(() => review);

        return {
            review: failedReview,
            findings: [],
        };
    }
};

export const createSnippetReview = async (userId, payload) => {
    const title = payload.title.trim();
    const language = payload.language?.trim() || DEFAULT_LANGUAGE;
    const fileName = payload.fileName?.trim() || null;
    const branchName = payload.branch?.trim() || null;
    const content = payload.code;
    const focusAreas = sanitizeFocusAreas(payload.focusAreas);

    const review = await reviewRepository.createReview({
        user_id: userId,
        review_type: "snippet",
        status: "queued",
    });

    let source;

    try {
        source = await reviewRepository.createReviewSource({
            review_id: review.id,
            source_type: "snippet",
            title,
            language,
            file_name: fileName,
            branch_name: branchName,
            content,
            line_count: getLineCount(content),
            character_count: content.length,
            metadata: { focusAreas },
        });

    } catch (error) {
        try {
            await reviewRepository.deleteReview(review.id);
        } catch (cleanupError) {
            console.error("Failed to clean up review after source insert failed", cleanupError);
        }
        throw error;
    }

    const analysis = await runStaticAnalysis(review, [{ ...source, content }]);

    return {
        review: mapReview(analysis.review),
        source: mapReviewSource(source),
        findings: analysis.findings.map(mapReviewFinding),
    };
};

export const createFileReview = async (userId, payload) => {
    const title = payload.title.trim();
    const fallbackLanguage = payload.language?.trim() || null;
    const branchName = payload.branch?.trim() || null;
    const focusAreas = sanitizeFocusAreas(payload.focusAreas);
    const review = await reviewRepository.createReview({
        user_id: userId,
        review_type: "file",
        status: "queued",
    });

    let sourceRecords;
    let sources;

    try {
        sourceRecords = payload.files.map((file) => {
            const fileName = file.fileName.trim();
            const content = file.content;
            const language =
                file.language?.trim() || fallbackLanguage || inferLanguageFromFileName(fileName);

            return {
                review_id: review.id,
                source_type: "file",
                title: file.title?.trim() || fileName,
                language,
                file_name: fileName,
                branch_name: branchName,
                content,
                line_count: getLineCount(content),
                character_count: content.length,
                metadata: {
                    reviewTitle: title,
                    focusAreas,
                    originalSize: file.size ?? null,
                    mimeType: file.type || null,
                },
            };
        });

        sources = await reviewRepository.createReviewSources(sourceRecords);
    } catch (error) {
        try {
            await reviewRepository.deleteReview(review.id);
        } catch (cleanupError) {
            console.error("Failed to clean up review after file source insert failed", cleanupError);
        }
        throw error;
    }

    const analysisSources = sources.map((source, index) => ({
        ...source,
        content: sourceRecords[index].content,
    }));
    const analysis = await runStaticAnalysis(review, analysisSources);

    return {
        review: mapReview(analysis.review),
        sources: sources.map(mapReviewSource),
        findings: analysis.findings.map(mapReviewFinding),
    };
};

export const listReviews = async (userId) => {
    const reviews = await reviewRepository.listReviewsByUser(userId);

    return reviews.map((review) => ({
        ...mapReview(review),
        sources: (review.review_sources || []).map(mapReviewSource),
        findings: (review.review_findings || []).map(mapReviewFinding),
    }));
};
