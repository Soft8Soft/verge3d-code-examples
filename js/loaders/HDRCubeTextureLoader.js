/**
* @author Prashant Sharma / spidersharma03
* @author Ben Houston / http://clara.io / bhouston
*/

v3d.HDRCubeTextureLoader = function(manager) {

    v3d.Loader.call(this, manager);

    this.hdrLoader = new v3d.RGBELoader();
    this.type = v3d.UnsignedByteType;

};

v3d.HDRCubeTextureLoader.prototype = Object.assign(Object.create(v3d.Loader.prototype), {

    constructor: v3d.HDRCubeTextureLoader,

    load: function(urls, onLoad, onProgress, onError) {

        if (!Array.isArray(urls)) {

            console.warn('v3d.HDRCubeTextureLoader signature has changed. Use .setDataType() instead.');

            this.setDataType(urls);

            urls = onLoad;
            onLoad = onProgress;
            onProgress = onError;
            onError = arguments[4];

        }

        var texture = new v3d.CubeTexture();

        texture.type = this.type;

        switch (texture.type) {

            case v3d.UnsignedByteType:

                texture.encoding = v3d.RGBEEncoding;
                texture.format = v3d.RGBAFormat;
                texture.minFilter = v3d.NearestFilter;
                texture.magFilter = v3d.NearestFilter;
                texture.generateMipmaps = false;
                break;

            case v3d.FloatType:

                texture.encoding = v3d.LinearEncoding;
                texture.format = v3d.RGBFormat;
                texture.minFilter = v3d.LinearFilter;
                texture.magFilter = v3d.LinearFilter;
                texture.generateMipmaps = false;
                break;

            case v3d.HalfFloatType:

                texture.encoding = v3d.LinearEncoding;
                texture.format = v3d.RGBFormat;
                texture.minFilter = v3d.LinearFilter;
                texture.magFilter = v3d.LinearFilter;
                texture.generateMipmaps = false;
                break;

        }

        var scope = this;

        var loaded = 0;

        function loadHDRData(i, onLoad, onProgress, onError) {

            new v3d.FileLoader(scope.manager)
                .setPath(scope.path)
                .setResponseType('arraybuffer')
                .load(urls[i], function(buffer) {

                    loaded ++;

                    var texData = scope.hdrLoader.parse(buffer);

                    if (!texData) return;

                    if (texData.data !== undefined) {

                        var dataTexture = new v3d.DataTexture(texData.data, texData.width, texData.height);

                        dataTexture.type = texture.type;
                        dataTexture.encoding = texture.encoding;
                        dataTexture.format = texture.format;
                        dataTexture.minFilter = texture.minFilter;
                        dataTexture.magFilter = texture.magFilter;
                        dataTexture.generateMipmaps = texture.generateMipmaps;

                        texture.images[i] = dataTexture;

                    }

                    if (loaded === 6) {

                        texture.needsUpdate = true;
                        if (onLoad) onLoad(texture);

                    }

                }, onProgress, onError);

        }

        for (var i = 0; i < urls.length; i++) {

            loadHDRData(i, onLoad, onProgress, onError);

        }

        return texture;

    },

    setDataType: function(value) {

        this.type = value;
        this.hdrLoader.setDataType(value);

        return this;

    }

});
