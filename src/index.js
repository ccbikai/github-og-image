export default {
	async fetch(request, env, context) {
		// 读取缓存
		const cacheUrl = new URL(request.url);
		const cacheKey = new Request(cacheUrl.toString());
		const cache = caches.default;
		const hasCache = await cache.match(cacheKey);
		if (hasCache) {
			console.log('cache: true');
			return hasCache;
		}
		const githubUrl = `https://github.com${cacheUrl.pathname}`;
		console.log(githubUrl);
		const githubRes = await fetch(githubUrl);
		let githubImage = 'https://github.githubassets.com/assets/campaign-social-031d6161fa10.png';
		const html = new HTMLRewriter()
			.on('meta[property="og:image"]', {
				element: (element) => {
					githubImage = element.getAttribute('content');
					return element;
				},
			})
			.transform(githubRes);
		await html.text();
		const imageRes = await fetch(githubImage, {
			headers: {
				'user-agent': request.headers.get('user-agent'),
			},
		});
		const imageResClone = new Response(imageRes.body, {
			headers: {
				'cache-control': 'public, max-age=43200',
				'content-type': imageRes.headers.get('content-type'),
			},
		});
		// 写入缓存
		context.waitUntil(cache.put(cacheKey, imageResClone.clone()));
		return imageResClone;
	},
};
