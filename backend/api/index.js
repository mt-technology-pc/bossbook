// Vercel deploys every file under api/ as its own serverless function.
// An Express app instance is itself a valid (req, res) handler, so
// re-exporting it here is all Vercel needs — vercel.json's rewrite sends
// every request to this one function and Express does its own internal
// routing from there, same as it does locally.
export { default } from '../src/index.js'
