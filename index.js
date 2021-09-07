const { parse } = require('url')
const { send } = require('micro')
const got = require('got');
const cache = require('memory-cache')

const metascraper = require('metascraper').load([
	require('metascraper-author')(),
	require('metascraper-date')(),
	require('metascraper-description')(),
	require('metascraper-image')(),
	require('metascraper-logo')(),
	require('metascraper-clearbit-logo')(),
	require('metascraper-logo-favicon')(),
	require('metascraper-publisher')(),
	require('metascraper-title')(),
	require('metascraper-url')(),
	require('metascraper-logo-favicon')(),
	require('metascraper-amazon')(),
	require('metascraper-youtube')(),
	require('metascraper-soundcloud')(),
	require('metascraper-video-provider')(),
	require('metascraper-video')(),
	require('metascraper-lang')()
])


const CACHE_IN_HOURS = 86400000 // 24 hours

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  let { query: { url, proxy = false } } = parse(req.url, true)
  if (!url) return send(res, 400, { error: true, message: 'url query param required!' })

  // validate url
  if (!url.toLowerCase().includes('http')) {
      // it means http or https is not included, we should add https
      url = `https://${url}`;
  }

  // if proxy then pipe request
  if (proxy) {
      return got.stream(url, {}).pipe(res).on('finish', () => {
          res.end();
      });
  }

  const cachedResult = cache.get(url)
  if (cachedResult) return send(res, 200, {...cachedResult, cache: true})

  let statusCode, data
  try {
    const { body: html } = await got(url, {
      headers: {
        'user-agent': 'WhatsApp/2.19.81 A' // this works for twitter as well
      }
    });
    data = await metascraper({ url, html })
    statusCode = 200
  } catch (err) {
    console.log(`Open Graph Error - ${err.toString()}`, err);
    statusCode = 400
    data = {error: true, message: `Connecting to "${url}" failed, Make sure your URL is correct or try again`};
  }

  // Cache results for 24 hours - not implmented
  if (statusCode === 200) {
  	cache.put(url, data, CACHE_IN_HOURS);
  }
  
  return send(res,statusCode, data)
}
