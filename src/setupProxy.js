const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
	app.use(
		'/api/nominatim',
		createProxyMiddleware({
			target: 'https://nominatim.openstreetmap.org',
			changeOrigin: true,
			pathRewrite: { '^/api/nominatim': '' },
			logLevel: 'silent',
			authorization: undefined,
			secure: true,
		})
	);
};