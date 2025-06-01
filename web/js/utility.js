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

const rand = (min=0,max=1)=> (max-min)*Math.random()+min;
const clamp = (x, min=0,max=1)=> x < min ? min : (x > max ? max : x);
const hex2css = (hex) => {
    if (hex == null) return '#000000';
    if (typeof hex === 'number') {
        hex = hex.toString(16).padStart(6, '0');
    }
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) {
        return '#000000';
    }
    return `#${hex.toLowerCase()}`;
};

function vec3Arr2Array(vecArr) {
  return vecArr.map(v => [v.x, v.y, v.z]);
}

export {
    hash,
    rand,
    clamp,
    hex2css,
    vec3Arr2Array
};