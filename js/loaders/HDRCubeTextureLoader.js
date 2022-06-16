(function() {

    class HDRCubeTextureLoader extends v3d.Loader {

        constructor(manager) {

            super(manager);
            this.hdrLoader = new v3d.RGBELoader();
            this.type = v3d.HalfFloatType;

        }

        load(urls, onLoad, onProgress, onError) {

            if (!Array.isArray(urls)) {

                console.warn('v3d.HDRCubeTextureLoader signature has changed. Use .setDataType() instead.');
                this.setDataType(urls);
                urls = onLoad;
                onLoad = onProgress;
                onProgress = onError;
                onError = arguments[4];

            }

            const texture = new v3d.CubeTexture();
            texture.type = this.type;

            switch (texture.type) {

                case v3d.FloatType:
                    texture.encoding = v3d.LinearEncoding;
                    texture.minFilter = v3d.LinearFilter;
                    texture.magFilter = v3d.LinearFilter;
                    texture.generateMipmaps = false;
                    break;

                case v3d.HalfFloatType:
                    texture.encoding = v3d.LinearEncoding;
                    texture.minFilter = v3d.LinearFilter;
                    texture.magFilter = v3d.LinearFilter;
                    texture.generateMipmaps = false;
                    break;

            }

            const scope = this;
            let loaded = 0;

            function loadHDRData(i, onLoad, onProgress, onError) {

                new v3d.FileLoader(scope.manager).setPath(scope.path).setResponseType('arraybuffer').setWithCredentials(scope.withCredentials).load(urls[i], function(buffer) {

                    loaded ++;
                    const texData = scope.hdrLoader.parse(buffer);
                    if (!texData) return;

                    if (texData.data !== undefined) {

                        const dataTexture = new v3d.DataTexture(texData.data, texData.width, texData.height);
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

            for (let i = 0; i < urls.length; i++) {

                loadHDRData(i, onLoad, onProgress, onError);

            }

            return texture;

        }

        setDataType(value) {

            this.type = value;
            this.hdrLoader.setDataType(value);
            return this;

        }

    }

    v3d.HDRCubeTextureLoader = HDRCubeTextureLoader;

})();
