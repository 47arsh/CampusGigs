const paginationMeta = ({ page, limit, total, totalKey = "total" }) => {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        [totalKey]: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};

export { paginationMeta };
