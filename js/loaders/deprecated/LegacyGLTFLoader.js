/**
 * @author Rich Tibbett / https://github.com/richtr
 * @author mrdoob / http://mrdoob.com/
 * @author Tony Parisi / http://www.tonyparisi.com/
 * @author Takahiro / https://github.com/takahirox
 */

v3d.LegacyGLTFLoader = (function() {

    function LegacyGLTFLoader(manager) {

        this.manager = (manager !== undefined) ? manager : v3d.DefaultLoadingManager;

    }

    LegacyGLTFLoader.prototype = {

        constructor: LegacyGLTFLoader,

        crossOrigin: 'anonymous',

        load: function(url, onLoad, onProgress, onError) {

            var scope = this;

            var resourcePath;

            if (this.resourcePath !== undefined) {

                resourcePath = this.resourcePath;

            } else if (this.path !== undefined) {

                resourcePath = this.path;

            } else {

                resourcePath = v3d.LoaderUtils.extractUrlBase(url);

            }

            var loader = new v3d.FileLoader(scope.manager);

            loader.setPath(this.path);
            loader.setResponseType('arraybuffer');

            loader.load(url, function(data) {

                scope.parse(data, resourcePath, onLoad);

            }, onProgress, onError);

        },

        setCrossOrigin: function(value) {

            this.crossOrigin = value;
            return this;

        },

        setPath: function(value) {

            this.path = value;

        },

        setResourcePath: function(value) {

            this.resourcePath = value;
            return this;

        },

        parse: function(data, path, callback) {

            var content;
            var extensions = {};

            var magic = v3d.LoaderUtils.decodeText(new Uint8Array(data, 0, 4));

            if (magic === BINARY_EXTENSION_HEADER_DEFAULTS.magic) {

                extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(data);
                content = extensions[EXTENSIONS.KHR_BINARY_GLTF].content;

            } else {

                content = v3d.LoaderUtils.decodeText(new Uint8Array(data));

            }

            var json = JSON.parse(content);

            if (json.extensionsUsed && json.extensionsUsed.indexOf(EXTENSIONS.KHR_MATERIALS_COMMON) >= 0) {

                extensions[EXTENSIONS.KHR_MATERIALS_COMMON] = new GLTFMaterialsCommonExtension(json);

            }

            var parser = new GLTFParser(json, extensions, {

                crossOrigin: this.crossOrigin,
                manager: this.manager,
                path: path || this.resourcePath || ''

            });

            parser.parse(function(scene, scenes, cameras, animations) {

                var glTF = {
                    "scene": scene,
                    "scenes": scenes,
                    "cameras": cameras,
                    "animations": animations
                };

                callback(glTF);

            });

        }

    };

    /* GLTFREGISTRY */

    function GLTFRegistry() {

        var objects = {};

        return    {

            get: function(key) {

                return objects[key];

            },

            add: function(key, object) {

                objects[key] = object;

            },

            remove: function(key) {

                delete objects[key];

            },

            removeAll: function() {

                objects = {};

            },

            update: function(scene, camera) {

                for (var name in objects) {

                    var object = objects[name];

                    if (object.update) {

                        object.update(scene, camera);

                    }

                }

            }

        };

    }

    /* GLTFSHADERS */

    LegacyGLTFLoader.Shaders = {

        update: function() {

            console.warn('v3d.LegacyGLTFLoader.Shaders has been deprecated, and now updates automatically.');

        }

    };

    /* GLTFSHADER */

    function GLTFShader(targetNode, allNodes) {

        var boundUniforms = {};

        // bind each uniform to its source node

        var uniforms = targetNode.material.uniforms;

        for (var uniformId in uniforms) {

            var uniform = uniforms[uniformId];

            if (uniform.semantic) {

                var sourceNodeRef = uniform.node;

                var sourceNode = targetNode;

                if (sourceNodeRef) {

                    sourceNode = allNodes[sourceNodeRef];

                }

                boundUniforms[uniformId] = {
                    semantic: uniform.semantic,
                    sourceNode: sourceNode,
                    targetNode: targetNode,
                    uniform: uniform
                };

            }

        }

        this.boundUniforms = boundUniforms;
        this._m4 = new v3d.Matrix4();

    }

    // Update - update all the uniform values
    GLTFShader.prototype.update = function(scene, camera) {

        var boundUniforms = this.boundUniforms;

        for (var name in boundUniforms) {

            var boundUniform = boundUniforms[name];

            switch (boundUniform.semantic) {

                case "MODELVIEW":

                    var m4 = boundUniform.uniform.value;
                    m4.multiplyMatrices(camera.matrixWorldInverse, boundUniform.sourceNode.matrixWorld);
                    break;

                case "MODELVIEWINVERSETRANSPOSE":

                    var m3 = boundUniform.uniform.value;
                    this._m4.multiplyMatrices(camera.matrixWorldInverse, boundUniform.sourceNode.matrixWorld);
                    m3.getNormalMatrix(this._m4);
                    break;

                case "PROJECTION":

                    var m4 = boundUniform.uniform.value;
                    m4.copy(camera.projectionMatrix);
                    break;

                case "JOINTMATRIX":

                    var m4v = boundUniform.uniform.value;

                    for (var mi = 0; mi < m4v.length; mi++) {

                        // So it goes like this:
                        // SkinnedMesh world matrix is already baked into MODELVIEW;
                        // transform joints to local space,
                        // then transform using joint's inverse
                        m4v[mi]
                            .getInverse(boundUniform.sourceNode.matrixWorld)
                            .multiply(boundUniform.targetNode.skeleton.bones[mi].matrixWorld)
                            .multiply(boundUniform.targetNode.skeleton.boneInverses[mi])
                            .multiply(boundUniform.targetNode.bindMatrix);

                    }

                    break;

                default :

                    console.warn("Unhandled shader semantic: " + boundUniform.semantic);
                    break;

            }

        }

    };


    /* ANIMATION */

    LegacyGLTFLoader.Animations = {

        update: function() {

            console.warn('v3d.LegacyGLTFLoader.Animation has been deprecated. Use v3d.AnimationMixer instead.');

        }

    };

    /*********************************/
    /********** EXTENSIONS ***********/
    /*********************************/

    var EXTENSIONS = {
        KHR_BINARY_GLTF: 'KHR_binary_glTF',
        KHR_MATERIALS_COMMON: 'KHR_materials_common'
    };

    /* MATERIALS COMMON EXTENSION */

    function GLTFMaterialsCommonExtension(json) {

        this.name = EXTENSIONS.KHR_MATERIALS_COMMON;

        this.lights = {};

        var extension = (json.extensions && json.extensions[EXTENSIONS.KHR_MATERIALS_COMMON]) || {};
        var lights = extension.lights || {};

        for (var lightId in lights) {

            var light = lights[lightId];
            var lightNode;

            var lightParams = light[light.type];
            var color = new v3d.Color().fromArray(lightParams.color);

            switch (light.type) {

                case "directional":
                    lightNode = new v3d.DirectionalLight(color);
                    lightNode.position.set(0, 0, 1);
                    break;

                case "point":
                    lightNode = new v3d.PointLight(color);
                    break;

                case "spot":
                    lightNode = new v3d.SpotLight(color);
                    lightNode.position.set(0, 0, 1);
                    break;

                case "ambient":
                    lightNode = new v3d.AmbientLight(color);
                    break;

            }

            if (lightNode) {

                this.lights[lightId] = lightNode;

            }

        }

    }

    /* BINARY EXTENSION */

    var BINARY_EXTENSION_BUFFER_NAME = 'binary_glTF';

    var BINARY_EXTENSION_HEADER_DEFAULTS = { magic: 'glTF', version: 1, contentFormat: 0 };

    var BINARY_EXTENSION_HEADER_LENGTH = 20;

    function GLTFBinaryExtension(data) {

        this.name = EXTENSIONS.KHR_BINARY_GLTF;

        var headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);

        var header = {
            magic: v3d.LoaderUtils.decodeText(new Uint8Array(data.slice(0, 4))),
            version: headerView.getUint32(4, true),
            length: headerView.getUint32(8, true),
            contentLength: headerView.getUint32(12, true),
            contentFormat: headerView.getUint32(16, true)
        };

        for (var key in BINARY_EXTENSION_HEADER_DEFAULTS) {

            var value = BINARY_EXTENSION_HEADER_DEFAULTS[key];

            if (header[key] !== value) {

                throw new Error('Unsupported glTF-Binary header: Expected "%s" to be "%s".', key, value);

            }

        }

        var contentArray = new Uint8Array(data, BINARY_EXTENSION_HEADER_LENGTH, header.contentLength);

        this.header = header;
        this.content = v3d.LoaderUtils.decodeText(contentArray);
        this.body = data.slice(BINARY_EXTENSION_HEADER_LENGTH + header.contentLength, header.length);

    }

    GLTFBinaryExtension.prototype.loadShader = function(shader, bufferViews) {

        var bufferView = bufferViews[shader.extensions[EXTENSIONS.KHR_BINARY_GLTF].bufferView];
        var array = new Uint8Array(bufferView);

        return v3d.LoaderUtils.decodeText(array);

    };

    /*********************************/
    /********** INTERNALS ************/
    /*********************************/

    /* CONSTANTS */

    var WEBGL_CONSTANTS = {
        FLOAT: 5126,
        //FLOAT_MAT2: 35674,
        FLOAT_MAT3: 35675,
        FLOAT_MAT4: 35676,
        FLOAT_VEC2: 35664,
        FLOAT_VEC3: 35665,
        FLOAT_VEC4: 35666,
        LINEAR: 9729,
        REPEAT: 10497,
        SAMPLER_2D: 35678,
        TRIANGLES: 4,
        LINES: 1,
        UNSIGNED_BYTE: 5121,
        UNSIGNED_SHORT: 5123,

        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632
    };

    var WEBGL_TYPE = {
        5126: Number,
        //35674: v3d.Matrix2,
        35675: v3d.Matrix3,
        35676: v3d.Matrix4,
        35664: v3d.Vector2,
        35665: v3d.Vector3,
        35666: v3d.Vector4,
        35678: v3d.Texture
    };

    var WEBGL_COMPONENT_TYPES = {
        5120: Int8Array,
        5121: Uint8Array,
        5122: Int16Array,
        5123: Uint16Array,
        5125: Uint32Array,
        5126: Float32Array
    };

    var WEBGL_FILTERS = {
        9728: v3d.NearestFilter,
        9729: v3d.LinearFilter,
        9984: v3d.NearestMipMapNearestFilter,
        9985: v3d.LinearMipMapNearestFilter,
        9986: v3d.NearestMipMapLinearFilter,
        9987: v3d.LinearMipMapLinearFilter
    };

    var WEBGL_WRAPPINGS = {
        33071: v3d.ClampToEdgeWrapping,
        33648: v3d.MirroredRepeatWrapping,
        10497: v3d.RepeatWrapping
    };

    var WEBGL_TEXTURE_FORMATS = {
        6406: v3d.AlphaFormat,
        6407: v3d.RGBFormat,
        6408: v3d.RGBAFormat,
        6409: v3d.LuminanceFormat,
        6410: v3d.LuminanceAlphaFormat
    };

    var WEBGL_TEXTURE_DATATYPES = {
        5121: v3d.UnsignedByteType,
        32819: v3d.UnsignedShort4444Type,
        32820: v3d.UnsignedShort5551Type,
        33635: v3d.UnsignedShort565Type
    };

    var WEBGL_SIDES = {
        1028: v3d.BackSide, // Culling front
        1029: v3d.FrontSide // Culling back
        //1032: v3d.NoSide   // Culling front and back, what to do?
    };

    var WEBGL_DEPTH_FUNCS = {
        512: v3d.NeverDepth,
        513: v3d.LessDepth,
        514: v3d.EqualDepth,
        515: v3d.LessEqualDepth,
        516: v3d.GreaterEqualDepth,
        517: v3d.NotEqualDepth,
        518: v3d.GreaterEqualDepth,
        519: v3d.AlwaysDepth
    };

    var WEBGL_BLEND_EQUATIONS = {
        32774: v3d.AddEquation,
        32778: v3d.SubtractEquation,
        32779: v3d.ReverseSubtractEquation
    };

    var WEBGL_BLEND_FUNCS = {
        0: v3d.ZeroFactor,
        1: v3d.OneFactor,
        768: v3d.SrcColorFactor,
        769: v3d.OneMinusSrcColorFactor,
        770: v3d.SrcAlphaFactor,
        771: v3d.OneMinusSrcAlphaFactor,
        772: v3d.DstAlphaFactor,
        773: v3d.OneMinusDstAlphaFactor,
        774: v3d.DstColorFactor,
        775: v3d.OneMinusDstColorFactor,
        776: v3d.SrcAlphaSaturateFactor
        // The followings are not supported by Three.js yet
        //32769: CONSTANT_COLOR,
        //32770: ONE_MINUS_CONSTANT_COLOR,
        //32771: CONSTANT_ALPHA,
        //32772: ONE_MINUS_CONSTANT_COLOR
    };

    var WEBGL_TYPE_SIZES = {
        'SCALAR': 1,
        'VEC2': 2,
        'VEC3': 3,
        'VEC4': 4,
        'MAT2': 4,
        'MAT3': 9,
        'MAT4': 16
    };

    var PATH_PROPERTIES = {
        scale: 'scale',
        translation: 'position',
        rotation: 'quaternion'
    };

    var INTERPOLATION = {
        LINEAR: v3d.InterpolateLinear,
        STEP: v3d.InterpolateDiscrete
    };

    var STATES_ENABLES = {
        2884: 'CULL_FACE',
        2929: 'DEPTH_TEST',
        3042: 'BLEND',
        3089: 'SCISSOR_TEST',
        32823: 'POLYGON_OFFSET_FILL',
        32926: 'SAMPLE_ALPHA_TO_COVERAGE'
    };

    /* UTILITY FUNCTIONS */

    function _each(object, callback, thisObj) {

        if (!object) {

            return Promise.resolve();

        }

        var results;
        var fns = [];

        if (Object.prototype.toString.call(object) === '[object Array]') {

            results = [];

            var length = object.length;

            for (var idx = 0; idx < length; idx ++) {

                var value = callback.call(thisObj || this, object[idx], idx);

                if (value) {

                    fns.push(value);

                    if (value instanceof Promise) {

                        value.then(function(key, value) {

                            results[key] = value;

                        }.bind(this, idx));

                    } else {

                        results[idx] = value;

                    }

                }

            }

        } else {

            results = {};

            for (var key in object) {

                if (object.hasOwnProperty(key)) {

                    var value = callback.call(thisObj || this, object[key], key);

                    if (value) {

                        fns.push(value);

                        if (value instanceof Promise) {

                            value.then(function(key, value) {

                                results[key] = value;

                            }.bind(this, key));

                        } else {

                            results[key] = value;

                        }

                    }

                }

            }

        }

        return Promise.all(fns).then(function() {

            return results;

        });

    }

    function resolveURL(url, path) {

        // Invalid URL
        if (typeof url !== 'string' || url === '')
            return '';

        // Absolute URL http://,https://,//
        if (/^(https?:)?\/\//i.test(url)) {

            return url;

        }

        // Data URI
        if (/^data:.*,.*$/i.test(url)) {

            return url;

        }

        // Blob URL
        if (/^blob:.*$/i.test(url)) {

            return url;

        }

        // Relative URL
        return (path || '') + url;

    }

    // Three.js seems too dependent on attribute names so globally
    // replace those in the shader code
    function replacev3dShaderAttributes(shaderText, technique) {

        // Expected technique attributes
        var attributes = {};

        for (var attributeId in technique.attributes) {

            var pname = technique.attributes[attributeId];

            var param = technique.parameters[pname];
            var atype = param.type;
            var semantic = param.semantic;

            attributes[attributeId] = {
                type: atype,
                semantic: semantic
            };

        }

        // Figure out which attributes to change in technique

        var shaderParams = technique.parameters;
        var shaderAttributes = technique.attributes;
        var params = {};

        for (var attributeId in attributes) {

            var pname = shaderAttributes[attributeId];
            var shaderParam = shaderParams[pname];
            var semantic = shaderParam.semantic;
            if (semantic) {

                params[attributeId] = shaderParam;

            }

        }

        for (var pname in params) {

            var param = params[pname];
            var semantic = param.semantic;

            var regEx = new RegExp("\\b" + pname + "\\b", "g");

            switch (semantic) {

                case "POSITION":

                    shaderText = shaderText.replace(regEx, 'position');
                    break;

                case "NORMAL":

                    shaderText = shaderText.replace(regEx, 'normal');
                    break;

                case 'TEXCOORD_0':
                case 'TEXCOORD0':
                case 'TEXCOORD':

                    shaderText = shaderText.replace(regEx, 'uv');
                    break;

                case 'TEXCOORD_1':

                    shaderText = shaderText.replace(regEx, 'uv2');
                    break;

                case 'COLOR_0':
                case 'COLOR0':
                case 'COLOR':

                    shaderText = shaderText.replace(regEx, 'color');
                    break;

                case "WEIGHT":

                    shaderText = shaderText.replace(regEx, 'skinWeight');
                    break;

                case "JOINT":

                    shaderText = shaderText.replace(regEx, 'skinIndex');
                    break;

            }

        }

        return shaderText;

    }

    function createDefaultMaterial() {

        return new v3d.MeshPhongMaterial({
            color: 0x00000,
            emissive: 0x888888,
            specular: 0x000000,
            shininess: 0,
            transparent: false,
            depthTest: true,
            side: v3d.FrontSide
        });

    }

    // Deferred constructor for RawShaderMaterial types
    function DeferredShaderMaterial(params) {

        this.isDeferredShaderMaterial = true;

        this.params = params;

    }

    DeferredShaderMaterial.prototype.create = function() {

        var uniforms = v3d.UniformsUtils.clone(this.params.uniforms);

        for (var uniformId in this.params.uniforms) {

            var originalUniform = this.params.uniforms[uniformId];

            if (originalUniform.value instanceof v3d.Texture) {

                uniforms[uniformId].value = originalUniform.value;
                uniforms[uniformId].value.needsUpdate = true;

            }

            uniforms[uniformId].semantic = originalUniform.semantic;
            uniforms[uniformId].node = originalUniform.node;

        }

        this.params.uniforms = uniforms;

        return new v3d.RawShaderMaterial(this.params);

    };

    /* GLTF PARSER */

    function GLTFParser(json, extensions, options) {

        this.json = json || {};
        this.extensions = extensions || {};
        this.options = options || {};

        // loader object cache
        this.cache = new GLTFRegistry();

    }

    GLTFParser.prototype._withDependencies = function(dependencies) {

        var _dependencies = {};

        for (var i = 0; i < dependencies.length; i++) {

            var dependency = dependencies[i];
            var fnName = "load" + dependency.charAt(0).toUpperCase() + dependency.slice(1);

            var cached = this.cache.get(dependency);

            if (cached !== undefined) {

                _dependencies[dependency] = cached;

            } else if (this[fnName]) {

                var fn = this[fnName]();
                this.cache.add(dependency, fn);

                _dependencies[dependency] = fn;

            }

        }

        return _each(_dependencies, function(dependency) {

            return dependency;

        });

    };

    GLTFParser.prototype.parse = function(callback) {

        var json = this.json;

        // Clear the loader cache
        this.cache.removeAll();

        // Fire the callback on complete
        this._withDependencies([

            "scenes",
            "cameras",
            "animations"

        ]).then(function(dependencies) {

            var scenes = [];

            for (var name in dependencies.scenes) {

                scenes.push(dependencies.scenes[name]);

            }

            var scene = json.scene !== undefined ? dependencies.scenes[json.scene] : scenes[0];

            var cameras = [];

            for (var name in dependencies.cameras) {

                var camera = dependencies.cameras[name];
                cameras.push(camera);

            }

            var animations = [];

            for (var name in dependencies.animations) {

                animations.push(dependencies.animations[name]);

            }

            callback(scene, scenes, cameras, animations);

        });

    };

    GLTFParser.prototype.loadShaders = function() {

        var json = this.json;
        var extensions = this.extensions;
        var options = this.options;

        return this._withDependencies([

            "bufferViews"

        ]).then(function(dependencies) {

            return _each(json.shaders, function(shader) {

                if (shader.extensions && shader.extensions[EXTENSIONS.KHR_BINARY_GLTF]) {

                    return extensions[EXTENSIONS.KHR_BINARY_GLTF].loadShader(shader, dependencies.bufferViews);

                }

                return new Promise(function(resolve) {

                    var loader = new v3d.FileLoader(options.manager);
                    loader.setResponseType('text');
                    loader.load(resolveURL(shader.uri, options.path), function(shaderText) {

                        resolve(shaderText);

                    });

                });

            });

        });

    };

    GLTFParser.prototype.loadBuffers = function() {

        var json = this.json;
        var extensions = this.extensions;
        var options = this.options;

        return _each(json.buffers, function(buffer, name) {

            if (name === BINARY_EXTENSION_BUFFER_NAME) {

                return extensions[EXTENSIONS.KHR_BINARY_GLTF].body;

            }

            if (buffer.type === 'arraybuffer' || buffer.type === undefined) {

                return new Promise(function(resolve) {

                    var loader = new v3d.FileLoader(options.manager);
                    loader.setResponseType('arraybuffer');
                    loader.load(resolveURL(buffer.uri, options.path), function(buffer) {

                        resolve(buffer);

                    });

                });

            } else {

                console.warn('v3d.LegacyGLTFLoader: ' + buffer.type + ' buffer type is not supported');

            }

        });

    };

    GLTFParser.prototype.loadBufferViews = function() {

        var json = this.json;

        return this._withDependencies([

            "buffers"

        ]).then(function(dependencies) {

            return _each(json.bufferViews, function(bufferView) {

                var arraybuffer = dependencies.buffers[bufferView.buffer];

                var byteLength = bufferView.byteLength !== undefined ? bufferView.byteLength : 0;

                return arraybuffer.slice(bufferView.byteOffset, bufferView.byteOffset + byteLength);

            });

        });

    };

    GLTFParser.prototype.loadAccessors = function() {

        var json = this.json;

        return this._withDependencies([

            "bufferViews"

        ]).then(function(dependencies) {

            return _each(json.accessors, function(accessor) {

                var arraybuffer = dependencies.bufferViews[accessor.bufferView];
                var itemSize = WEBGL_TYPE_SIZES[accessor.type];
                var TypedArray = WEBGL_COMPONENT_TYPES[accessor.componentType];

                // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
                var elementBytes = TypedArray.BYTES_PER_ELEMENT;
                var itemBytes = elementBytes * itemSize;

                // The buffer is not interleaved if the stride is the item size in bytes.
                if (accessor.byteStride && accessor.byteStride !== itemBytes) {

                    // Use the full buffer if it's interleaved.
                    var array = new TypedArray(arraybuffer);

                    // Integer parameters to IB/IBA are in array elements, not bytes.
                    var ib = new v3d.InterleavedBuffer(array, accessor.byteStride / elementBytes);

                    return new v3d.InterleavedBufferAttribute(ib, itemSize, accessor.byteOffset / elementBytes);

                } else {

                    array = new TypedArray(arraybuffer, accessor.byteOffset, accessor.count * itemSize);

                    return new v3d.BufferAttribute(array, itemSize);

                }

            });

        });

    };

    GLTFParser.prototype.loadTextures = function() {

        var json = this.json;
        var extensions = this.extensions;
        var options = this.options;

        return this._withDependencies([

            "bufferViews"

        ]).then(function(dependencies) {

            return _each(json.textures, function(texture) {

                if (texture.source) {

                    return new Promise(function(resolve) {

                        var source = json.images[texture.source];
                        var sourceUri = source.uri;
                        var isObjectURL = false;

                        if (source.extensions && source.extensions[EXTENSIONS.KHR_BINARY_GLTF]) {

                            var metadata = source.extensions[EXTENSIONS.KHR_BINARY_GLTF];
                            var bufferView = dependencies.bufferViews[metadata.bufferView];
                            var blob = new Blob([bufferView], { type: metadata.mimeType });
                            sourceUri = URL.createObjectURL(blob);
                            isObjectURL = true;

                        }

                        var textureLoader = v3d.Loader.Handlers.get(sourceUri);

                        if (textureLoader === null) {

                            textureLoader = new v3d.TextureLoader(options.manager);

                        }

                        textureLoader.setCrossOrigin(options.crossOrigin);

                        textureLoader.load(resolveURL(sourceUri, options.path), function(_texture) {

                            if (isObjectURL) URL.revokeObjectURL(sourceUri);

                            _texture.flipY = false;

                            if (texture.name !== undefined) _texture.name = texture.name;

                            _texture.format = texture.format !== undefined ? WEBGL_TEXTURE_FORMATS[texture.format] : v3d.RGBAFormat;

                            if (texture.internalFormat !== undefined && _texture.format !== WEBGL_TEXTURE_FORMATS[texture.internalFormat]) {

                                console.warn('v3d.LegacyGLTFLoader: Three.js doesn\'t support texture internalFormat which is different from texture format. ' +
                                                            'internalFormat will be forced to be the same value as format.');

                            }

                            _texture.type = texture.type !== undefined ? WEBGL_TEXTURE_DATATYPES[texture.type] : v3d.UnsignedByteType;

                            if (texture.sampler) {

                                var sampler = json.samplers[texture.sampler];

                                _texture.magFilter = WEBGL_FILTERS[sampler.magFilter] || v3d.LinearFilter;
                                _texture.minFilter = WEBGL_FILTERS[sampler.minFilter] || v3d.NearestMipMapLinearFilter;
                                _texture.wrapS = WEBGL_WRAPPINGS[sampler.wrapS] || v3d.RepeatWrapping;
                                _texture.wrapT = WEBGL_WRAPPINGS[sampler.wrapT] || v3d.RepeatWrapping;

                            }

                            resolve(_texture);

                        }, undefined, function() {

                            if (isObjectURL) URL.revokeObjectURL(sourceUri);

                            resolve();

                        });

                    });

                }

            });

        });

    };

    GLTFParser.prototype.loadMaterials = function() {

        var json = this.json;

        return this._withDependencies([

            "shaders",
            "textures"

        ]).then(function(dependencies) {

            return _each(json.materials, function(material) {

                var materialType;
                var materialValues = {};
                var materialParams = {};

                var khr_material;

                if (material.extensions && material.extensions[EXTENSIONS.KHR_MATERIALS_COMMON]) {

                    khr_material = material.extensions[EXTENSIONS.KHR_MATERIALS_COMMON];

                }

                if (khr_material) {

                    // don't copy over unused values to avoid material warning spam
                    var keys = ['ambient', 'emission', 'transparent', 'transparency', 'doubleSided'];

                    switch (khr_material.technique) {

                        case 'BLINN' :
                        case 'PHONG' :
                            materialType = v3d.MeshPhongMaterial;
                            keys.push('diffuse', 'specular', 'shininess');
                            break;

                        case 'LAMBERT' :
                            materialType = v3d.MeshLambertMaterial;
                            keys.push('diffuse');
                            break;

                        case 'CONSTANT' :
                        default :
                            materialType = v3d.MeshBasicMaterial;
                            break;

                    }

                    keys.forEach(function(v) {

                        if (khr_material.values[v] !== undefined) materialValues[v] = khr_material.values[v];

                    });

                    if (khr_material.doubleSided || materialValues.doubleSided) {

                        materialParams.side = v3d.DoubleSide;

                    }

                    if (khr_material.transparent || materialValues.transparent) {

                        materialParams.transparent = true;
                        materialParams.opacity = (materialValues.transparency !== undefined) ? materialValues.transparency : 1;

                    }

                } else if (material.technique === undefined) {

                    materialType = v3d.MeshPhongMaterial;

                    Object.assign(materialValues, material.values);

                } else {

                    materialType = DeferredShaderMaterial;

                    var technique = json.techniques[material.technique];

                    materialParams.uniforms = {};

                    var program = json.programs[technique.program];

                    if (program) {

                        materialParams.fragmentShader = dependencies.shaders[program.fragmentShader];

                        if (!materialParams.fragmentShader) {

                            console.warn("ERROR: Missing fragment shader definition:", program.fragmentShader);
                            materialType = v3d.MeshPhongMaterial;

                        }

                        var vertexShader = dependencies.shaders[program.vertexShader];

                        if (!vertexShader) {

                            console.warn("ERROR: Missing vertex shader definition:", program.vertexShader);
                            materialType = v3d.MeshPhongMaterial;

                        }

                        // IMPORTANT: FIX VERTEX SHADER ATTRIBUTE DEFINITIONS
                        materialParams.vertexShader = replacev3dShaderAttributes(vertexShader, technique);

                        var uniforms = technique.uniforms;

                        for (var uniformId in uniforms) {

                            var pname = uniforms[uniformId];
                            var shaderParam = technique.parameters[pname];

                            var ptype = shaderParam.type;

                            if (WEBGL_TYPE[ptype]) {

                                var pcount = shaderParam.count;
                                var value;

                                if (material.values !== undefined) value = material.values[pname];

                                var uvalue = new WEBGL_TYPE[ptype]();
                                var usemantic = shaderParam.semantic;
                                var unode = shaderParam.node;

                                switch (ptype) {

                                    case WEBGL_CONSTANTS.FLOAT:

                                        uvalue = shaderParam.value;

                                        if (pname == "transparency") {

                                            materialParams.transparent = true;

                                        }

                                        if (value !== undefined) {

                                            uvalue = value;

                                        }

                                        break;

                                    case WEBGL_CONSTANTS.FLOAT_VEC2:
                                    case WEBGL_CONSTANTS.FLOAT_VEC3:
                                    case WEBGL_CONSTANTS.FLOAT_VEC4:
                                    case WEBGL_CONSTANTS.FLOAT_MAT3:

                                        if (shaderParam && shaderParam.value) {

                                            uvalue.fromArray(shaderParam.value);

                                        }

                                        if (value) {

                                            uvalue.fromArray(value);

                                        }

                                        break;

                                    case WEBGL_CONSTANTS.FLOAT_MAT2:

                                        // what to do?
                                        console.warn("FLOAT_MAT2 is not a supported uniform type");
                                        break;

                                    case WEBGL_CONSTANTS.FLOAT_MAT4:

                                        if (pcount) {

                                            uvalue = new Array(pcount);

                                            for (var mi = 0; mi < pcount; mi++) {

                                                uvalue[mi] = new WEBGL_TYPE[ptype]();

                                            }

                                            if (shaderParam && shaderParam.value) {

                                                var m4v = shaderParam.value;
                                                uvalue.fromArray(m4v);

                                            }

                                            if (value) {

                                                uvalue.fromArray(value);

                                            }

                                        } else {

                                            if (shaderParam && shaderParam.value) {

                                                var m4 = shaderParam.value;
                                                uvalue.fromArray(m4);

                                            }

                                            if (value) {

                                                uvalue.fromArray(value);

                                            }

                                        }

                                        break;

                                    case WEBGL_CONSTANTS.SAMPLER_2D:

                                        if (value !== undefined) {

                                            uvalue = dependencies.textures[value];

                                        } else if (shaderParam.value !== undefined) {

                                            uvalue = dependencies.textures[shaderParam.value];

                                        } else {

                                            uvalue = null;

                                        }

                                        break;

                                }

                                materialParams.uniforms[uniformId] = {
                                    value: uvalue,
                                    semantic: usemantic,
                                    node: unode
                                };

                            } else {

                                throw new Error("Unknown shader uniform param type: " + ptype);

                            }

                        }

                        var states = technique.states || {};
                        var enables = states.enable || [];
                        var functions = states.functions || {};

                        var enableCullFace = false;
                        var enableDepthTest = false;
                        var enableBlend = false;

                        for (var i = 0, il = enables.length; i < il; i++) {

                            var enable = enables[i];

                            switch (STATES_ENABLES[enable]) {

                                case 'CULL_FACE':

                                    enableCullFace = true;

                                    break;

                                case 'DEPTH_TEST':

                                    enableDepthTest = true;

                                    break;

                                case 'BLEND':

                                    enableBlend = true;

                                    break;

                                // TODO: implement
                                case 'SCISSOR_TEST':
                                case 'POLYGON_OFFSET_FILL':
                                case 'SAMPLE_ALPHA_TO_COVERAGE':

                                    break;

                                default:

                                    throw new Error("Unknown technique.states.enable: " + enable);

                            }

                        }

                        if (enableCullFace) {

                            materialParams.side = functions.cullFace !== undefined ? WEBGL_SIDES[functions.cullFace] : v3d.FrontSide;

                        } else {

                            materialParams.side = v3d.DoubleSide;

                        }

                        materialParams.depthTest = enableDepthTest;
                        materialParams.depthFunc = functions.depthFunc !== undefined ? WEBGL_DEPTH_FUNCS[functions.depthFunc] : v3d.LessDepth;
                        materialParams.depthWrite = functions.depthMask !== undefined ? functions.depthMask[0] : true;

                        materialParams.blending = enableBlend ? v3d.CustomBlending : v3d.NoBlending;
                        materialParams.transparent = enableBlend;

                        var blendEquationSeparate = functions.blendEquationSeparate;

                        if (blendEquationSeparate !== undefined) {

                            materialParams.blendEquation = WEBGL_BLEND_EQUATIONS[blendEquationSeparate[0]];
                            materialParams.blendEquationAlpha = WEBGL_BLEND_EQUATIONS[blendEquationSeparate[1]];

                        } else {

                            materialParams.blendEquation = v3d.AddEquation;
                            materialParams.blendEquationAlpha = v3d.AddEquation;

                        }

                        var blendFuncSeparate = functions.blendFuncSeparate;

                        if (blendFuncSeparate !== undefined) {

                            materialParams.blendSrc = WEBGL_BLEND_FUNCS[blendFuncSeparate[0]];
                            materialParams.blendDst = WEBGL_BLEND_FUNCS[blendFuncSeparate[1]];
                            materialParams.blendSrcAlpha = WEBGL_BLEND_FUNCS[blendFuncSeparate[2]];
                            materialParams.blendDstAlpha = WEBGL_BLEND_FUNCS[blendFuncSeparate[3]];

                        } else {

                            materialParams.blendSrc = v3d.OneFactor;
                            materialParams.blendDst = v3d.ZeroFactor;
                            materialParams.blendSrcAlpha = v3d.OneFactor;
                            materialParams.blendDstAlpha = v3d.ZeroFactor;

                        }

                    }

                }

                if (Array.isArray(materialValues.diffuse)) {

                    materialParams.color = new v3d.Color().fromArray(materialValues.diffuse);

                } else if (typeof (materialValues.diffuse) === 'string') {

                    materialParams.map = dependencies.textures[materialValues.diffuse];

                }

                delete materialParams.diffuse;

                if (typeof (materialValues.reflective) === 'string') {

                    materialParams.envMap = dependencies.textures[materialValues.reflective];

                }

                if (typeof (materialValues.bump) === 'string') {

                    materialParams.bumpMap = dependencies.textures[materialValues.bump];

                }

                if (Array.isArray(materialValues.emission)) {

                    if (materialType === v3d.MeshBasicMaterial) {

                        materialParams.color = new v3d.Color().fromArray(materialValues.emission);

                    } else {

                        materialParams.emissive = new v3d.Color().fromArray(materialValues.emission);

                    }

                } else if (typeof (materialValues.emission) === 'string') {

                    if (materialType === v3d.MeshBasicMaterial) {

                        materialParams.map = dependencies.textures[materialValues.emission];

                    } else {

                        materialParams.emissiveMap = dependencies.textures[materialValues.emission];

                    }

                }

                if (Array.isArray(materialValues.specular)) {

                    materialParams.specular = new v3d.Color().fromArray(materialValues.specular);

                } else if (typeof (materialValues.specular) === 'string') {

                    materialParams.specularMap = dependencies.textures[materialValues.specular];

                }

                if (materialValues.shininess !== undefined) {

                    materialParams.shininess = materialValues.shininess;

                }

                var _material = new materialType(materialParams);
                if (material.name !== undefined) _material.name = material.name;

                return _material;

            });

        });

    };

    GLTFParser.prototype.loadMeshes = function() {

        var json = this.json;

        return this._withDependencies([

            "accessors",
            "materials"

        ]).then(function(dependencies) {

            return _each(json.meshes, function(mesh) {

                var group = new v3d.Group();
                if (mesh.name !== undefined) group.name = mesh.name;

                if (mesh.extras) group.userData = mesh.extras;

                var primitives = mesh.primitives || [];

                for (var name in primitives) {

                    var primitive = primitives[name];

                    if (primitive.mode === WEBGL_CONSTANTS.TRIANGLES || primitive.mode === undefined) {

                        var geometry = new v3d.BufferGeometry();

                        var attributes = primitive.attributes;

                        for (var attributeId in attributes) {

                            var attributeEntry = attributes[attributeId];

                            if (!attributeEntry) return;

                            var bufferAttribute = dependencies.accessors[attributeEntry];

                            switch (attributeId) {

                                case 'POSITION':
                                    geometry.addAttribute('position', bufferAttribute);
                                    break;

                                case 'NORMAL':
                                    geometry.addAttribute('normal', bufferAttribute);
                                    break;

                                case 'TEXCOORD_0':
                                case 'TEXCOORD0':
                                case 'TEXCOORD':
                                    geometry.addAttribute('uv', bufferAttribute);
                                    break;

                                case 'TEXCOORD_1':
                                    geometry.addAttribute('uv2', bufferAttribute);
                                    break;

                                case 'COLOR_0':
                                case 'COLOR0':
                                case 'COLOR':
                                    geometry.addAttribute('color', bufferAttribute);
                                    break;

                                case 'WEIGHT':
                                    geometry.addAttribute('skinWeight', bufferAttribute);
                                    break;

                                case 'JOINT':
                                    geometry.addAttribute('skinIndex', bufferAttribute);
                                    break;

                                default:

                                    if (!primitive.material) break;

                                    var material = json.materials[primitive.material];

                                    if (!material.technique) break;

                                    var parameters = json.techniques[material.technique].parameters || {};

                                    for (var attributeName in parameters) {

                                        if (parameters[attributeName]['semantic'] === attributeId) {

                                            geometry.addAttribute(attributeName, bufferAttribute);

                                        }

                                    }

                            }

                        }

                        if (primitive.indices) {

                            geometry.setIndex(dependencies.accessors[primitive.indices]);

                        }

                        var material = dependencies.materials !== undefined ? dependencies.materials[primitive.material] : createDefaultMaterial();

                        var meshNode = new v3d.Mesh(geometry, material);
                        meshNode.castShadow = true;
                        meshNode.name = (name === "0" ? group.name : group.name + name);

                        if (primitive.extras) meshNode.userData = primitive.extras;

                        group.add(meshNode);

                    } else if (primitive.mode === WEBGL_CONSTANTS.LINES) {

                        var geometry = new v3d.BufferGeometry();

                        var attributes = primitive.attributes;

                        for (var attributeId in attributes) {

                            var attributeEntry = attributes[attributeId];

                            if (!attributeEntry) return;

                            var bufferAttribute = dependencies.accessors[attributeEntry];

                            switch (attributeId) {

                                case 'POSITION':
                                    geometry.addAttribute('position', bufferAttribute);
                                    break;

                                case 'COLOR_0':
                                case 'COLOR0':
                                case 'COLOR':
                                    geometry.addAttribute('color', bufferAttribute);
                                    break;

                            }

                        }

                        var material = dependencies.materials[primitive.material];

                        var meshNode;

                        if (primitive.indices) {

                            geometry.setIndex(dependencies.accessors[primitive.indices]);

                            meshNode = new v3d.LineSegments(geometry, material);

                        } else {

                            meshNode = new v3d.Line(geometry, material);

                        }

                        meshNode.name = (name === "0" ? group.name : group.name + name);

                        if (primitive.extras) meshNode.userData = primitive.extras;

                        group.add(meshNode);

                    } else {

                        console.warn("Only triangular and line primitives are supported");

                    }

                }

                return group;

            });

        });

    };

    GLTFParser.prototype.loadCameras = function() {

        var json = this.json;

        return _each(json.cameras, function(camera) {

            if (camera.type == "perspective" && camera.perspective) {

                var yfov = camera.perspective.yfov;
                var aspectRatio = camera.perspective.aspectRatio !== undefined ? camera.perspective.aspectRatio : 1;

                // According to COLLADA spec...
                // aspectRatio = xfov / yfov
                var xfov = yfov * aspectRatio;

                var _camera = new v3d.PerspectiveCamera(v3d.Math.radToDeg(xfov), aspectRatio, camera.perspective.znear || 1, camera.perspective.zfar || 2e6);
                if (camera.name !== undefined) _camera.name = camera.name;

                if (camera.extras) _camera.userData = camera.extras;

                return _camera;

            } else if (camera.type == "orthographic" && camera.orthographic) {

                var _camera = new v3d.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, camera.orthographic.znear, camera.orthographic.zfar);
                if (camera.name !== undefined) _camera.name = camera.name;

                if (camera.extras) _camera.userData = camera.extras;

                return _camera;

            }

        });

    };

    GLTFParser.prototype.loadSkins = function() {

        var json = this.json;

        return this._withDependencies([

            "accessors"

        ]).then(function(dependencies) {

            return _each(json.skins, function(skin) {

                var bindShapeMatrix = new v3d.Matrix4();

                if (skin.bindShapeMatrix !== undefined) bindShapeMatrix.fromArray(skin.bindShapeMatrix);

                var _skin = {
                    bindShapeMatrix: bindShapeMatrix,
                    jointNames: skin.jointNames,
                    inverseBindMatrices: dependencies.accessors[skin.inverseBindMatrices]
                };

                return _skin;

            });

        });

    };

    GLTFParser.prototype.loadAnimations = function() {

        var json = this.json;

        return this._withDependencies([

            "accessors",
            "nodes"

        ]).then(function(dependencies) {

            return _each(json.animations, function(animation, animationId) {

                var tracks = [];

                for (var channelId in animation.channels) {

                    var channel = animation.channels[channelId];
                    var sampler = animation.samplers[channel.sampler];

                    if (sampler) {

                        var target = channel.target;
                        var name = target.id;
                        var input = animation.parameters !== undefined ? animation.parameters[sampler.input] : sampler.input;
                        var output = animation.parameters !== undefined ? animation.parameters[sampler.output] : sampler.output;

                        var inputAccessor = dependencies.accessors[input];
                        var outputAccessor = dependencies.accessors[output];

                        var node = dependencies.nodes[name];

                        if (node) {

                            node.updateMatrix();
                            node.matrixAutoUpdate = true;

                            var TypedKeyframeTrack = PATH_PROPERTIES[target.path] === PATH_PROPERTIES.rotation
                                ? v3d.QuaternionKeyframeTrack
                                : v3d.VectorKeyframeTrack;

                            var targetName = node.name ? node.name : node.uuid;
                            var interpolation = sampler.interpolation !== undefined ? INTERPOLATION[sampler.interpolation] : v3d.InterpolateLinear;

                            // KeyframeTrack.optimize() will modify given 'times' and 'values'
                            // buffers before creating a truncated copy to keep. Because buffers may
                            // be reused by other tracks, make copies here.
                            tracks.push(new TypedKeyframeTrack(
                                targetName + '.' + PATH_PROPERTIES[target.path],
                                v3d.AnimationUtils.arraySlice(inputAccessor.array, 0),
                                v3d.AnimationUtils.arraySlice(outputAccessor.array, 0),
                                interpolation
                            ));

                        }

                    }

                }

                var name = animation.name !== undefined ? animation.name : "animation_" + animationId;

                return new v3d.AnimationClip(name, undefined, tracks);

            });

        });

    };

    GLTFParser.prototype.loadNodes = function() {

        var json = this.json;
        var extensions = this.extensions;
        var scope = this;

        return _each(json.nodes, function(node) {

            var matrix = new v3d.Matrix4();

            var _node;

            if (node.jointName) {

                _node = new v3d.Bone();
                _node.name = node.name !== undefined ? node.name : node.jointName;
                _node.jointName = node.jointName;

            } else {

                _node = new v3d.Object3D();
                if (node.name !== undefined) _node.name = node.name;

            }

            if (node.extras) _node.userData = node.extras;

            if (node.matrix !== undefined) {

                matrix.fromArray(node.matrix);
                _node.applyMatrix(matrix);

            } else {

                if (node.translation !== undefined) {

                    _node.position.fromArray(node.translation);

                }

                if (node.rotation !== undefined) {

                    _node.quaternion.fromArray(node.rotation);

                }

                if (node.scale !== undefined) {

                    _node.scale.fromArray(node.scale);

                }

            }

            return _node;

        }).then(function(__nodes) {

            return scope._withDependencies([

                "meshes",
                "skins",
                "cameras"

            ]).then(function(dependencies) {

                return _each(__nodes, function(_node, nodeId) {

                    var node = json.nodes[nodeId];

                    if (node.meshes !== undefined) {

                        for (var meshId in node.meshes) {

                            var mesh = node.meshes[meshId];
                            var group = dependencies.meshes[mesh];

                            if (group === undefined) {

                                console.warn('LegacyGLTFLoader: Couldn\'t find node "' + mesh + '".');
                                continue;

                            }

                            for (var childrenId in group.children) {

                                var child = group.children[childrenId];

                                // clone Mesh to add to _node

                                var originalMaterial = child.material;
                                var originalGeometry = child.geometry;
                                var originalUserData = child.userData;
                                var originalName = child.name;

                                var material;

                                if (originalMaterial.isDeferredShaderMaterial) {

                                    originalMaterial = material = originalMaterial.create();

                                } else {

                                    material = originalMaterial;

                                }

                                switch (child.type) {

                                    case 'LineSegments':
                                        child = new v3d.LineSegments(originalGeometry, material);
                                        break;

                                    case 'LineLoop':
                                        child = new v3d.LineLoop(originalGeometry, material);
                                        break;

                                    case 'Line':
                                        child = new v3d.Line(originalGeometry, material);
                                        break;

                                    default:
                                        child = new v3d.Mesh(originalGeometry, material);

                                }

                                child.castShadow = true;
                                child.userData = originalUserData;
                                child.name = originalName;

                                var skinEntry;

                                if (node.skin) {

                                    skinEntry = dependencies.skins[node.skin];

                                }

                                // Replace Mesh with SkinnedMesh in library
                                if (skinEntry) {

                                    var getJointNode = function(jointId) {

                                        var keys = Object.keys(__nodes);

                                        for (var i = 0, il = keys.length; i < il; i++) {

                                            var n = __nodes[keys[i]];

                                            if (n.jointName === jointId) return n;

                                        }

                                        return null;

                                    };

                                    var geometry = originalGeometry;
                                    var material = originalMaterial;
                                    material.skinning = true;

                                    child = new v3d.SkinnedMesh(geometry, material);
                                    child.castShadow = true;
                                    child.userData = originalUserData;
                                    child.name = originalName;

                                    var bones = [];
                                    var boneInverses = [];

                                    for (var i = 0, l = skinEntry.jointNames.length; i < l; i++) {

                                        var jointId = skinEntry.jointNames[i];
                                        var jointNode = getJointNode(jointId);

                                        if (jointNode) {

                                            bones.push(jointNode);

                                            var m = skinEntry.inverseBindMatrices.array;
                                            var mat = new v3d.Matrix4().fromArray(m, i * 16);
                                            boneInverses.push(mat);

                                        } else {

                                            console.warn("WARNING: joint: '" + jointId + "' could not be found");

                                        }

                                    }

                                    child.bind(new v3d.Skeleton(bones, boneInverses), skinEntry.bindShapeMatrix);

                                    var buildBoneGraph = function(parentJson, parentObject, property) {

                                        var children = parentJson[property];

                                        if (children === undefined) return;

                                        for (var i = 0, il = children.length; i < il; i++) {

                                            var nodeId = children[i];
                                            var bone = __nodes[nodeId];
                                            var boneJson = json.nodes[nodeId];

                                            if (bone !== undefined && bone.isBone === true && boneJson !== undefined) {

                                                parentObject.add(bone);
                                                buildBoneGraph(boneJson, bone, 'children');

                                            }

                                        }

                                    };

                                    buildBoneGraph(node, child, 'skeletons');

                                }

                                _node.add(child);

                            }

                        }

                    }

                    if (node.camera !== undefined) {

                        var camera = dependencies.cameras[node.camera];

                        _node.add(camera);

                    }

                    if (node.extensions
                             && node.extensions[EXTENSIONS.KHR_MATERIALS_COMMON]
                             && node.extensions[EXTENSIONS.KHR_MATERIALS_COMMON].light) {

                        var extensionLights = extensions[EXTENSIONS.KHR_MATERIALS_COMMON].lights;
                        var light = extensionLights[node.extensions[EXTENSIONS.KHR_MATERIALS_COMMON].light];

                        _node.add(light);

                    }

                    return _node;

                });

            });

        });

    };

    GLTFParser.prototype.loadScenes = function() {

        var json = this.json;

        // scene node hierachy builder

        function buildNodeHierachy(nodeId, parentObject, allNodes) {

            var _node = allNodes[nodeId];
            parentObject.add(_node);

            var node = json.nodes[nodeId];

            if (node.children) {

                var children = node.children;

                for (var i = 0, l = children.length; i < l; i++) {

                    var child = children[i];
                    buildNodeHierachy(child, _node, allNodes);

                }

            }

        }

        return this._withDependencies([

            "nodes"

        ]).then(function(dependencies) {

            return _each(json.scenes, function(scene) {

                var _scene = new v3d.Scene();
                if (scene.name !== undefined) _scene.name = scene.name;

                if (scene.extras) _scene.userData = scene.extras;

                var nodes = scene.nodes || [];

                for (var i = 0, l = nodes.length; i < l; i++) {

                    var nodeId = nodes[i];
                    buildNodeHierachy(nodeId, _scene, dependencies.nodes);

                }

                _scene.traverse(function(child) {

                    // Register raw material meshes with LegacyGLTFLoader.Shaders
                    if (child.material && child.material.isRawShaderMaterial) {

                        child.gltfShader = new GLTFShader(child, dependencies.nodes);
                        child.onBeforeRender = function(renderer, scene, camera) {

                            this.gltfShader.update(scene, camera);

                        };

                    }

                });

                return _scene;

            });

        });

    };

    return LegacyGLTFLoader;

})();
