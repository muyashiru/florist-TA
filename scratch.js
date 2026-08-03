const str = 'halo min, saya mau pesan baxl 005';
const matches = str.match(/[a-zA-Z]{2,6}[_\-\s]?[0-9]{2,4}/g);
console.log(matches);
