const response = await fetch('https://0d5b4616.10xcards-exs.pages.dev', {
  headers: {
    'User-Agent': 'node-test'
  }
});
const text = await response.text();
console.log('status:', response.status);
console.log('body:', text);
