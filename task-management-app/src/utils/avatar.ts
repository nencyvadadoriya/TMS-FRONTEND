export const toAvatarUrl = (value: unknown): string => {
    const str = value == null ? '' : String(value).trim();
    if (!str) return '';
    if (/^https?:\/\//i.test(str)) return str;
    if (/^data:image\//i.test(str)) return str;
    return '';
};

export const userAvatarUrl = (user: unknown): string => {
    if (!user || typeof user !== 'object') return '';
    return toAvatarUrl((user as any).avatar);
};
