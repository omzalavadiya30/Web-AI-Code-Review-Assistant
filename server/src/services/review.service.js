import * as reviewRepository from "../repositories/review.repository.js";

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
    overall_score: review.overall_score,
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
        status: "draft",
    });

    try {
        const source = await reviewRepository.createReviewSource({
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

        return {
            review: mapReview(review),
            source: mapReviewSource(source),
        };
    } catch (error) {
        try {
            await reviewRepository.deleteReview(review.id);
        } catch (cleanupError) {
            console.error("Failed to clean up review after source insert failed", cleanupError);
        }
        throw error;
    }
};

export const createFileReview = async (userId, payload) => {
    const title = payload.title.trim();
    const fallbackLanguage = payload.language?.trim() || null;
    const branchName = payload.branch?.trim() || null;
    const focusAreas = sanitizeFocusAreas(payload.focusAreas);
    const review = await reviewRepository.createReview({
        user_id: userId,
        review_type: "file",
        status: "draft",
    });

    try {
        const sources = await reviewRepository.createReviewSources(
            payload.files.map((file) => {
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
            })
        );

        return {
            review: mapReview(review),
            sources: sources.map(mapReviewSource),
        };
    } catch (error) {
        try {
            await reviewRepository.deleteReview(review.id);
        } catch (cleanupError) {
            console.error("Failed to clean up review after file source insert failed", cleanupError);
        }
        throw error;
    }
};

export const listReviews = async (userId) => {
    const reviews = await reviewRepository.listReviewsByUser(userId);

    return reviews.map((review) => ({
        ...mapReview(review),
        sources: (review.review_sources || []).map(mapReviewSource),
    }));
};
