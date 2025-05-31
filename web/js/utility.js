function hash(input, length=8, chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    
    const s = typeof input === 'number' ? input.toFixed(10) : String(input);
    const n = chars.length;

    let hash = 2166136261;
    for (let i = 0; i < s.length; i++) {
        hash ^= s.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    hash = Math.abs(hash);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[hash % n];
        hash = Math.floor(hash / n);
        if (hash === 0) hash = i + s.length + 77777;
    }
    return result;
}

export {
    hash
};