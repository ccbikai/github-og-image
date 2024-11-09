function getGithubImage(githubImage, pathname) {
	const imageURL = new URL(githubImage);
	if (imageURL.hostname !== 'repository-images.githubusercontent.com') {
		const imagePath = imageURL.pathname.replaceAll('/', '').replaceAll('-', '');
		return `https://opengraph.githubassets.com/${imagePath}${pathname}`;
	}
	return githubImage;
}

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
		if (cacheUrl.pathname === '/') {
			return new Response(null, {
				status: 302,
				headers: {
					location: 'https://github.com/ccbikai/github-og-image',
				},
			});
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
		const imageRes = await fetch(getGithubImage(githubImage, cacheUrl.pathname), {
			headers: {
				'user-agent': request.headers.get('user-agent'),
			},
		});
		if (imageRes.ok) {
			const imageResClone = new Response(imageRes.body, {
				headers: {
					'cache-control': 'public,max-age=604800,s-maxage=604800',
					'content-type': imageRes.headers.get('content-type'),
				},
			});
			// 写入缓存
			context.waitUntil(cache.put(cacheKey, imageResClone.clone()));
			return imageResClone;
		}
		return imageRes
	},
};
