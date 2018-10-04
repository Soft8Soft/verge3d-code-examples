/**
 * @author mrdoob / http://mrdoob.com/
 * @author zz85 / http://joshuakoo.com/
 */

v3d.SVGLoader = function(manager) {

    this.manager = (manager !== undefined) ? manager : v3d.DefaultLoadingManager;

};

v3d.SVGLoader.prototype = {

    constructor: v3d.SVGLoader,

    load: function(url, onLoad, onProgress, onError) {

        var scope = this;

        var parser = new DOMParser();

        var loader = new v3d.FileLoader(scope.manager);
        loader.load(url, function(svgString) {

            var doc = parser.parseFromString(svgString, 'image/svg+xml'); // application/xml

            onLoad(doc.documentElement);

        }, onProgress, onError);

    }

};
