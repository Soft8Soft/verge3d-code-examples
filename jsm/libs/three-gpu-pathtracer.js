import { ShaderMaterial, NoBlending, NormalBlending, Color, Vector2, WebGLRenderTarget, RGBAFormat, FloatType, BufferAttribute, Mesh, BufferGeometry, PerspectiveCamera, Camera, SpotLight, RectAreaLight, DataTexture, ClampToEdgeWrapping, DoubleSide, BackSide, FrontSide, WebGLArrayRenderTarget, UnsignedByteType, LinearFilter, RepeatWrapping, MeshBasicMaterial, NoToneMapping, Source, HalfFloatType, DataUtils, RedFormat, Vector3, Matrix4, Quaternion, Loader, MathUtils, FileLoader, PMREMGenerator, EquirectangularReflectionMapping, Vector4, Matrix3 } from 'v3d';
import { FullScreenQuad } from 'v3d/examples/jsm/postprocessing/Pass.js';
import { StaticGeometryGenerator, SAH, MeshBVH, MeshBVHUniformStruct, FloatVertexAttributeTexture, UIntVertexAttributeTexture, shaderStructs, shaderIntersectFunction } from 'three-mesh-bvh';
import { mergeVertices, mergeBufferGeometries } from 'v3d/examples/jsm/utils/BufferGeometryUtils.js';

class MaterialBase extends ShaderMaterial {

    constructor(shader) {

        super(shader);

        for (const key in this.uniforms) {

            Object.defineProperty(this, key, {

                get() {

                    return this.uniforms[key].value;

                },

                set(v) {

                    this.uniforms[key].value = v;

                }

            });

        }

    }

    // sets the given named define value and sets "needsUpdate" to true if it's different
    setDefine(name, value = undefined) {

        if (value === undefined || value === null) {

            if (name in this.defines) {

                delete this.defines[name];
                this.needsUpdate = true;

            }

        } else {

            if (this.defines[name] !== value) {

                this.defines[name] = value;
                this.needsUpdate = true;

            }

        }

    }

}

class BlendMaterial extends MaterialBase {

    constructor(parameters) {

        super({

            blending: NoBlending,

            uniforms: {

                target1: { value: null },
                target2: { value: null },
                opacity: { value: 1.0 },

            },

            vertexShader: /* glsl */`

                varying vec2 vUv;

                void main() {

                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

                }`,

            fragmentShader: /* glsl */`

                uniform float opacity;

                uniform sampler2D target1;
                uniform sampler2D target2;

                varying vec2 vUv;

                void main() {

                    vec4 color1 = texture2D(target1, vUv);
                    vec4 color2 = texture2D(target2, vUv);

                    float invOpacity = 1.0 - opacity;
                    float totalAlpha = color1.a * invOpacity + color2.a * opacity;

                    if (color1.a != 0.0 || color2.a != 0.0) {

                        gl_FragColor.rgb = color1.rgb * (invOpacity * color1.a / totalAlpha) + color2.rgb * (opacity * color2.a / totalAlpha);
                        gl_FragColor.a = totalAlpha;

                    } else {

                        gl_FragColor = vec4(0.0);

                    }

                }`

        });

        this.setValues(parameters);

    }

}

function* renderTask() {

    const {
        _renderer,
        _fsQuad,
        _blendQuad,
        _primaryTarget,
        _blendTargets,
        alpha,
        camera,
        material,
    } = this;

    const blendMaterial = _blendQuad.material;
    let [blendTarget1, blendTarget2] = _blendTargets;

    while (true) {

        if (alpha) {

            blendMaterial.opacity = 1 / (this.samples + 1);
            material.blending = NoBlending;
            material.opacity = 1;

        } else {

            material.opacity = 1 / (this.samples + 1);
            material.blending = NormalBlending;

        }

        const w = _primaryTarget.width;
        const h = _primaryTarget.height;
        material.resolution.set(w, h);
        material.seed ++;

        const tilesX = this.tiles.x || 1;
        const tilesY = this.tiles.y || 1;
        const totalTiles = tilesX * tilesY;
        const dprInv = (1 / _renderer.getPixelRatio());
        for (let y = 0; y < tilesY; y ++) {

            for (let x = 0; x < tilesX; x ++) {

                material.cameraWorldMatrix.copy(camera.matrixWorld);
                material.invProjectionMatrix.copy(camera.projectionMatrixInverse);

                // Perspective camera (default)
                let cameraType = 0;

                // An orthographic projection matrix will always have the bottom right element == 1
                // And a perspective projection matrix will always have the bottom right element == 0
                if (camera.projectionMatrix.elements[15] > 0) {

                    // Orthographic
                    cameraType = 1;

                }

                if (camera.isEquirectCamera) {

                    // Equirectangular
                    cameraType = 2;

                }

                material.setDefine('CAMERA_TYPE', cameraType);

                const ogRenderTarget = _renderer.getRenderTarget();
                const ogAutoClear = _renderer.autoClear;

                let tx = x;
                let ty = y;
                if (!this.stableTiles) {

                    const tileIndex = (this._currentTile) % (tilesX * tilesY);
                    tx = tileIndex % tilesX;
                    ty = ~ ~ (tileIndex / tilesX);

                    this._currentTile = tileIndex + 1;

                }

                // three.js renderer takes values relative to the current pixel ratio
                _renderer.setRenderTarget(_primaryTarget);
                _renderer.setScissorTest(true);
                _renderer.setScissor(
                    dprInv * Math.ceil(tx * w / tilesX),
                    dprInv * Math.ceil((tilesY - ty - 1) * h / tilesY),
                    dprInv * Math.ceil(w / tilesX),
                    dprInv * Math.ceil(h / tilesY));
                _renderer.autoClear = false;
                _fsQuad.render(_renderer);

                _renderer.setScissorTest(false);
                _renderer.setRenderTarget(ogRenderTarget);
                _renderer.autoClear = ogAutoClear;

                if (alpha) {

                    blendMaterial.target1 = blendTarget1.texture;
                    blendMaterial.target2 = _primaryTarget.texture;

                    _renderer.setRenderTarget(blendTarget2);
                    _blendQuad.render(_renderer);
                    _renderer.setRenderTarget(ogRenderTarget);

                }

                this.samples += (1 / totalTiles);

                yield;

            }

        }

        [blendTarget1, blendTarget2] = [blendTarget2, blendTarget1];

        this.samples = Math.round(this.samples);

    }

}

const ogClearColor = new Color();
class PathTracingRenderer {

    get material() {

        return this._fsQuad.material;

    }

    set material(v) {

        this._fsQuad.material = v;

    }

    get target() {

        return this._alpha ? this._blendTargets[1] : this._primaryTarget;

    }

    set alpha(v) {

        if (!v) {

            this._blendTargets[0].dispose();
            this._blendTargets[1].dispose();

        }

        this._alpha = v;
        this.reset();

    }

    get alpha() {

        return this._alpha;

    }

    constructor(renderer) {

        this.camera = null;
        this.tiles = new Vector2(1, 1);

        this.samples = 0;
        this.stableNoise = false;
        this.stableTiles = true;

        this._renderer = renderer;
        this._alpha = false;
        this._fsQuad = new FullScreenQuad(null);
        this._blendQuad = new FullScreenQuad(new BlendMaterial());
        this._task = null;
        this._currentTile = 0;

        this._primaryTarget = new WebGLRenderTarget(1, 1, {
            format: RGBAFormat,
            type: FloatType,
        });
        this._blendTargets = [
            new WebGLRenderTarget(1, 1, {
                format: RGBAFormat,
                type: FloatType,
            }),
            new WebGLRenderTarget(1, 1, {
                format: RGBAFormat,
                type: FloatType,
            }),
        ];

    }

    setSize(w, h) {

        this._primaryTarget.setSize(w, h);
        this._blendTargets[0].setSize(w, h);
        this._blendTargets[1].setSize(w, h);
        this.reset();

    }

    dispose() {

        this._primaryTarget.dispose();
        this._blendTargets[0].dispose();
        this._blendTargets[1].dispose();

        this._fsQuad.dispose();
        this._blendQuad.dispose();
        this._task = null;

    }

    reset() {

        const { _renderer, _primaryTarget, _blendTargets } = this;
        const ogRenderTarget = _renderer.getRenderTarget();
        const ogClearAlpha = _renderer.getClearAlpha();
        _renderer.getClearColor(ogClearColor);

        _renderer.setRenderTarget(_primaryTarget);
        _renderer.setClearColor(0, 0);
        _renderer.clearColor();

        _renderer.setRenderTarget(_blendTargets[0]);
        _renderer.setClearColor(0, 0);
        _renderer.clearColor();

        _renderer.setRenderTarget(_blendTargets[1]);
        _renderer.setClearColor(0, 0);
        _renderer.clearColor();

        _renderer.setClearColor(ogClearColor, ogClearAlpha);
        _renderer.setRenderTarget(ogRenderTarget);

        this.samples = 0;
        this._task = null;

        if (this.stableNoise) {

            this.material.seed = 0;

        }

    }

    update() {

        if (!this._task) {

            this._task = renderTask.call(this);

        }

        this._task.next();

    }

}

function getGroupMaterialIndicesAttribute(geometry, materials, allMaterials) {

    const indexAttr = geometry.index;
    const posAttr = geometry.attributes.position;
    const vertCount = posAttr.count;
    const totalCount = indexAttr ? indexAttr.count : vertCount;
    let groups = geometry.groups;
    if (groups.length === 0) {

        groups = [{ count: totalCount, start: 0, materialIndex: 0 }];

    }

    // use an array with the minimum precision required to store all material id references.
    let materialArray;
    if (allMaterials.length <= 255) {

        materialArray = new Uint8Array(vertCount);

    } else {

        materialArray = new Uint16Array(vertCount);

    }

    for (let i = 0; i < groups.length; i++) {

        const group = groups[i];
        const start = group.start;
        const count = group.count;
        const endCount = Math.min(count, totalCount - start);

        const mat = Array.isArray(materials) ? materials[group.materialIndex] : materials;
        const materialIndex = allMaterials.indexOf(mat);

        for (let j = 0; j < endCount; j ++) {

            let index = start + j;
            if (indexAttr) {

                index = indexAttr.getX(index);

            }

            materialArray[index] = materialIndex;

        }

    }

    return new BufferAttribute(materialArray, 1, false);

}

function trimToAttributes(geometry, attributes) {

    // trim any unneeded attributes
    if (attributes) {

        for (const key in geometry.attributes) {

            if (!attributes.includes(key)) {

                geometry.deleteAttribute(key);

            }

        }

    }

}

function setCommonAttributes(geometry, options) {

    const { attributes = [], normalMapRequired = false } = options;

    if (!geometry.attributes.normal && (attributes && attributes.includes('normal'))) {

        geometry.computeVertexNormals();

    }

    if (!geometry.attributes.uv && (attributes && attributes.includes('uv'))) {

        const vertCount = geometry.attributes.position.count;
        geometry.setAttribute('uv', new BufferAttribute(new Float32Array(vertCount * 2), 2, false));

    }

    if (!geometry.attributes.tangent && (attributes && attributes.includes('tangent'))) {

        if (normalMapRequired) {

            // computeTangents requires an index buffer
            if (geometry.index === null) {

                geometry = mergeVertices(geometry);

            }

            geometry.computeTangents();

        } else {

            const vertCount = geometry.attributes.position.count;
            geometry.setAttribute('tangent', new BufferAttribute(new Float32Array(vertCount * 4), 4, false));

        }

    }

    if (!geometry.attributes.color && (attributes && attributes.includes('color'))) {

        const vertCount = geometry.attributes.position.count;
        const array = new Float32Array(vertCount * 4);
        array.fill(1.0);
        geometry.setAttribute('color', new BufferAttribute(array, 4));

    }

    if (!geometry.index) {

        // TODO: compute a typed array
        const indexCount = geometry.attributes.position.count;
        const array = new Array(indexCount);
        for (let i = 0; i < indexCount; i++) {

            array[i] = i;

        }

        geometry.setIndex(array);

    }

}

function mergeMeshes(meshes, options = {}) {

    options = { attributes: null, cloneGeometry: true, ...options };

    const transformedGeometry = [];
    const materialSet = new Set();
    for (let i = 0, l = meshes.length; i < l; i++) {

        // save any materials
        const mesh = meshes[i];
        if (mesh.visible === false) continue;

        if (Array.isArray(mesh.material)) {

            mesh.material.forEach(m => materialSet.add(m));

        } else {

            materialSet.add(mesh.material);

        }

    }

    const materials = Array.from(materialSet);
    for (let i = 0, l = meshes.length; i < l; i++) {

        // ensure the matrix world is up to date
        const mesh = meshes[i];
        if (mesh.visible === false) continue;

        mesh.updateMatrixWorld();

        // apply the matrix world to the geometry
        const originalGeometry = meshes[i].geometry;
        const geometry = options.cloneGeometry ? originalGeometry.clone() : originalGeometry;
        geometry.applyMatrix4(mesh.matrixWorld);

        // ensure our geometry has common attributes
        setCommonAttributes(geometry, {
            attributes: options.attributes,
            normalMapRequired: ! ! mesh.material.normalMap,
        });
        trimToAttributes(geometry, options.attributes);

        // create the material index attribute
        const materialIndexAttribute = getGroupMaterialIndicesAttribute(geometry, mesh.material, materials);
        geometry.setAttribute('materialIndex', materialIndexAttribute);

        transformedGeometry.push(geometry);

    }

    const textureSet = new Set();
    materials.forEach(material => {

        for (const key in material) {

            const value = material[key];
            if (value && value.isTexture) {

                textureSet.add(value);

            }

        }

    });

    const geometry = mergeBufferGeometries(transformedGeometry, false);
    const textures = Array.from(textureSet);
    return { geometry, materials, textures };

}

class PathTracingSceneGenerator {

    prepScene(scene) {

        scene = Array.isArray(scene) ? scene : [scene];

        const meshes = [];
        const lights = [];

        for (let i = 0, l = scene.length; i < l; i++) {

            scene[i].traverse(c => {

                if (c.isSkinnedMesh || c.isMesh && c.morphTargetInfluences) {

                    const generator = new StaticGeometryGenerator(c);
                    generator.attributes = ['position', 'color', 'normal', 'tangent', 'uv', 'uv2'];
                    generator.applyWorldTransforms = false;
                    const mesh = new Mesh(
                        generator.generate(),
                        c.material,
                    );
                    mesh.matrixWorld.copy(c.matrixWorld);
                    mesh.matrix.copy(c.matrixWorld);
                    mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
                    meshes.push(mesh);

                } else if (c.isMesh) {

                    meshes.push(c);

                } else if (c.isRectAreaLight || c.isSpotLight) {

                    lights.push(c);

                }

            });

        }

        return {
            ...mergeMeshes(meshes, {
                attributes: ['position', 'normal', 'tangent', 'uv', 'color'],
            }),
            lights,
        };

    }

    generate(scene, options = {}) {

        const { materials, textures, geometry, lights } = this.prepScene(scene);
        const bvhOptions = { strategy: SAH, ...options, maxLeafTris: 1 };
        return {
            scene,
            materials,
            textures,
            lights,
            bvh: new MeshBVH(geometry, bvhOptions),
        };

    }

}

class DynamicPathTracingSceneGenerator {

    get initialized() {

        return Boolean(this.bvh);

    }

    constructor(scene) {

        this.objects = Array.isArray(scene) ? scene : [scene];
        this.bvh = null;
        this.geometry = new BufferGeometry();
        this.materials = null;
        this.textures = null;
        this.lights = [];
        this.staticGeometryGenerator = new StaticGeometryGenerator(scene);

    }

    reset() {

        this.bvh = null;
        this.geometry.dispose();
        this.geometry = new BufferGeometry();
        this.materials = null;
        this.textures = null;
        this.lights = [];
        this.staticGeometryGenerator = new StaticGeometryGenerator(this.objects);

    }

    dispose() {}

    generate() {

        const { objects, staticGeometryGenerator, geometry } = this;
        if (this.bvh === null) {

            const attributes = ['position', 'normal', 'tangent', 'uv', 'color'];

            for (let i = 0, l = objects.length; i < l; i++) {

                objects[i].traverse(c => {

                    if (c.isMesh) {

                        const normalMapRequired = ! ! c.material.normalMap;
                        setCommonAttributes(c.geometry, { attributes, normalMapRequired });

                    } else if (c.isRectAreaLight || c.isSpotLight) {

                        this.lights.push(c);

                    }

                });

            }

            const textureSet = new Set();
            const materials = staticGeometryGenerator.getMaterials();
            materials.forEach(material => {

                for (const key in material) {

                    const value = material[key];
                    if (value && value.isTexture) {

                        textureSet.add(value);

                    }

                }

            });

            staticGeometryGenerator.attributes = attributes;
            staticGeometryGenerator.generate(geometry);

            const materialIndexAttribute = getGroupMaterialIndicesAttribute(geometry, materials, materials);
            geometry.setAttribute('materialIndex', materialIndexAttribute);
            geometry.clearGroups();

            this.bvh = new MeshBVH(geometry);
            this.materials = materials;
            this.textures = Array.from(textureSet);

            return {
                lights: this.lights,
                bvh: this.bvh,
                materials: this.materials,
                textures: this.textures,
                objects,
            };

        } else {

            const { bvh } = this;
            staticGeometryGenerator.generate(geometry);
            bvh.refit();
            return {
                lights: this.lights,
                bvh: this.bvh,
                materials: this.materials,
                textures: this.textures,
                objects,
            };

        }

    }


}

// https://github.com/gkjohnson/webxr-sandbox/blob/main/skinned-mesh-batching/src/MaterialReducer.js

function isTypedArray(arr) {

    return arr.buffer instanceof ArrayBuffer && 'BYTES_PER_ELEMENT' in arr;

}

class MaterialReducer {

    constructor() {

        const ignoreKeys = new Set();
        ignoreKeys.add('uuid');

        this.ignoreKeys = ignoreKeys;
        this.shareTextures = true;
        this.textures = [];
        this.materials = [];

    }

    areEqual(objectA, objectB) {

        const keySet = new Set();
        const traverseSet = new Set();
        const ignoreKeys = this.ignoreKeys;

        const traverse = (a, b) => {

            if (a === b) {

                return true;

            }

            if (a && b && a instanceof Object && b instanceof Object) {

                if (traverseSet.has(a) || traverseSet.has(b)) {

                    throw new Error('MaterialReducer: Material is recursive.');

                }

                const aIsElement = a instanceof Element;
                const bIsElement = b instanceof Element;
                if (aIsElement || bIsElement) {

                    if (aIsElement !== bIsElement || ! (a instanceof Image) || ! (b instanceof Image)) {

                        return false;

                    }

                    return a.src === b.src;

                }

                const aIsImageBitmap = a instanceof ImageBitmap;
                const bIsImageBitmap = b instanceof ImageBitmap;
                if (aIsImageBitmap || bIsImageBitmap) {

                    return false;

                }

                if (a.equals) {

                    return a.equals(b);

                }

                const aIsTypedArray = isTypedArray(a);
                const bIsTypedArray = isTypedArray(b);
                if (aIsTypedArray || bIsTypedArray) {

                    if (aIsTypedArray !== bIsTypedArray || a.constructor !== b.constructor || a.length !== b.length) {

                        return false;

                    }

                    for (let i = 0, l = a.length; i < l; i++) {

                        if (a[i] !== b[i]) return false;

                    }

                    return true;

                }

                traverseSet.add(a);
                traverseSet.add(b);

                keySet.clear();
                for (const key in a) {

                    if (!a.hasOwnProperty(key) || a[key] instanceof Function || ignoreKeys.has(key)) {

                        continue;

                    }

                    keySet.add(key);

                }

                for (const key in b) {

                    if (!b.hasOwnProperty(key) || b[key] instanceof Function || ignoreKeys.has(key)) {

                        continue;

                    }

                    keySet.add(key);

                }

                const keys = Array.from(keySet.values());
                let result = true;
                for (const i in keys) {

                    const key = keys[i];
                    if (ignoreKeys.has(key)) {

                        continue;

                    }

                    result = traverse(a[key], b[key]);
                    if (!result) {

                        break;

                    }

                }

                traverseSet.delete(a);
                traverseSet.delete(b);
                return result;

            }

            return false;

        };

        return traverse(objectA, objectB);

    }

    process(object) {

        const { textures, materials } = this;
        let replaced = 0;

        const processMaterial = material => {

            // Check if another material matches this one
            let foundMaterial = null;
            for (const i in materials) {

                const otherMaterial = materials[i];
                if (this.areEqual(material, otherMaterial)) {

                    foundMaterial = otherMaterial;

                }

            }

            if (foundMaterial) {

                replaced ++;
                return foundMaterial;

            } else {

                materials.push(material);

                if (this.shareTextures) {

                    // See if there's another texture that matches the ones on this material
                    for (const key in material) {

                        if (!material.hasOwnProperty(key)) continue;

                        const value = material[key];
                        if (value && value.isTexture && value.image instanceof Image) {

                            let foundTexture = null;
                            for (const i in textures) {

                                const texture = textures[i];
                                if (this.areEqual(texture, value)) {

                                    foundTexture = texture;
                                    break;

                                }

                            }

                            if (foundTexture) {

                                material[key] = foundTexture;

                            } else {

                                textures.push(value);

                            }

                        }

                    }

                }

                return material;

            }

        };

        object.traverse(c => {

            if (c.isMesh && c.material) {

                const material = c.material;
                if (Array.isArray(material)) {

                    for (let i = 0; i < material.length; i++) {

                        material[i] = processMaterial(material[i]);

                    }

                } else {

                    c.material = processMaterial(material);

                }

            }

        });

        return { replaced, retained: materials.length };

    }

}

class PhysicalCamera extends PerspectiveCamera {

    set bokehSize(size) {

        this.fStop = this.getFocalLength() / size;

    }

    get bokehSize() {

        return this.getFocalLength() / this.fStop;

    }

    constructor(...args) {

        super(...args);
        this.fStop = 1.4;
        this.apertureBlades = 0;
        this.apertureRotation = 0;
        this.focusDistance = 25;
        this.anamorphicRatio = 1;

    }

}

class EquirectCamera extends Camera {

    constructor() {

        super();

        this.isEquirectCamera = true;

    }

}

class PhysicalSpotLight extends SpotLight {

    constructor(...args) {

        super(...args);

        this.iesTexture = null;
        this.radius = 0;

    }

}

class ShapedAreaLight extends RectAreaLight {

    constructor(...args) {

        super(...args);
        this.isCircular = false;

    }

}

const MATERIAL_PIXELS = 45;
const MATERIAL_STRIDE = MATERIAL_PIXELS * 4;

const SIDE_OFFSET = 13 * 4 + 3; // s12.a
const MATTE_OFFSET = 14 * 4 + 0; // s14.r
const SHADOW_OFFSET = 14 * 4 + 1; // s14.g

class MaterialsTexture extends DataTexture {

    constructor() {

        super(new Float32Array(4), 1, 1);

        this.format = RGBAFormat;
        this.type = FloatType;
        this.wrapS = ClampToEdgeWrapping;
        this.wrapT = ClampToEdgeWrapping;
        this.generateMipmaps = false;
        this.threeCompatibilityTransforms = false;

    }

    setCastShadow(materialIndex, cast) {

        // invert the shadow value so we default to "true" when initializing a material
        const array = this.image.data;
        const index = materialIndex * MATERIAL_STRIDE + SHADOW_OFFSET;
        array[index] = ! cast ? 1 : 0;

    }

    getCastShadow(materialIndex) {

        const array = this.image.data;
        const index = materialIndex * MATERIAL_STRIDE + SHADOW_OFFSET;
        return ! Boolean(array[index]);

    }

    setSide(materialIndex, side) {

        const array = this.image.data;
        const index = materialIndex * MATERIAL_STRIDE + SIDE_OFFSET;
        switch (side) {

        case FrontSide:
            array[index] = 1;
            break;
        case BackSide:
            array[index] = -1;
            break;
        case DoubleSide:
            array[index] = 0;
            break;

        }

    }

    getSide(materialIndex) {

        const array = this.image.data;
        const index = materialIndex * MATERIAL_STRIDE + SIDE_OFFSET;
        switch (array[index]) {

        case 0:
            return DoubleSide;
        case 1:
            return FrontSide;
        case - 1:
            return BackSide;

        }

        return 0;

    }

    setMatte(materialIndex, matte) {

        const array = this.image.data;
        const index = materialIndex * MATERIAL_STRIDE + MATTE_OFFSET;
        array[index] = matte ? 1 : 0;

    }

    getMatte(materialIndex) {

        const array = this.image.data;
        const index = materialIndex * MATERIAL_STRIDE + MATTE_OFFSET;
        return Boolean(array[index]);

    }

    updateFrom(materials, textures) {

        function getTexture(material, key, def = -1) {

            return key in material ? textures.indexOf(material[key]) : def;

        }

        function getField(material, key, def) {

            return key in material ? material[key] : def;

        }

        function getUVTransformTexture(material) {

            // https://github.com/mrdoob/three.js/blob/f3a832e637c98a404c64dae8174625958455e038/src/renderers/webgl/WebGLMaterials.js#L204-L306
            // https://threejs.org/docs/#api/en/textures/Texture.offset
            // fallback order of textures to use as a common uv transform
            return material.map ||
                material.specularMap ||
                material.displacementMap ||
                material.normalMap ||
                material.bumpMap ||
                material.roughnessMap ||
                material.metalnessMap ||
                material.alphaMap ||
                material.emissiveMap ||
                material.clearcoatMap ||
                material.clearcoatNormalMap ||
                material.clearcoatRoughnessMap ||
                material.iridescenceMap ||
                material.iridescenceThicknessMap ||
                material.specularIntensityMap ||
                material.specularColorMap ||
                material.transmissionMap ||
                material.thicknessMap ||
                material.sheenColorMap ||
                material.sheenRoughnessMap ||
                null;

        }

        function writeTextureMatrixToArray(material, textureKey, array, offset) {

            let texture;
            if (threeCompatibilityTransforms) {

                texture = getUVTransformTexture(material);

            } else {

                texture = material[textureKey] && material[textureKey].isTexture ? material[textureKey] : null;

            }

            // check if texture exists
            if (texture) {

                const elements = texture.matrix.elements;

                let i = 0;

                // first row
                array[offset + i++] = elements[0];
                array[offset + i++] = elements[3];
                array[offset + i++] = elements[6];
                i++;

                // second row
                array[offset + i++] = elements[1];
                array[offset + i++] = elements[4];
                array[offset + i++] = elements[7];
                i++;

            }

            return 8;

        }

        let index = 0;
        const pixelCount = materials.length * MATERIAL_PIXELS;
        const dimension = Math.ceil(Math.sqrt(pixelCount));
        const { threeCompatibilityTransforms, image } = this;

        if (image.width !== dimension) {

            this.dispose();

            image.data = new Float32Array(dimension * dimension * 4);
            image.width = dimension;
            image.height = dimension;

        }

        const floatArray = image.data;

        // on some devices (Google Pixel 6) the "floatBitsToInt" function does not work correctly so we
        // can't encode texture ids that way.
        // const intArray = new Int32Array(floatArray.buffer);

        for (let i = 0, l = materials.length; i < l; i++) {

            const m = materials[i];

            // sample 0
            // color
            floatArray[index ++] = m.color.r;
            floatArray[index ++] = m.color.g;
            floatArray[index ++] = m.color.b;
            floatArray[index ++] = getTexture(m, 'map');

            // sample 1
            // metalness & roughness
            floatArray[index ++] = getField(m, 'metalness', 0.0);
            floatArray[index ++] = textures.indexOf(m.metalnessMap);
            floatArray[index ++] = getField(m, 'roughness', 0.0);
            floatArray[index ++] = textures.indexOf(m.roughnessMap);

            // sample 2
            // transmission & emissiveIntensity
            // three.js assumes a default f0 of 0.04 if no ior is provided which equates to an ior of 1.5
            floatArray[index ++] = getField(m, 'ior', 1.5);
            floatArray[index ++] = getField(m, 'transmission', 0.0);
            floatArray[index ++] = getTexture(m, 'transmissionMap');
            floatArray[index ++] = getField(m, 'emissiveIntensity', 0.0);

            // sample 3
            // emission
            if ('emissive' in m) {

                floatArray[index ++] = m.emissive.r;
                floatArray[index ++] = m.emissive.g;
                floatArray[index ++] = m.emissive.b;

            } else {

                floatArray[index ++] = 0.0;
                floatArray[index ++] = 0.0;
                floatArray[index ++] = 0.0;

            }

            floatArray[index ++] = getTexture(m, 'emissiveMap');

            // sample 4
            // normals
            floatArray[index ++] = getTexture(m, 'normalMap');
            if ('normalScale' in m) {

                floatArray[index ++] = m.normalScale.x;
                floatArray[index ++] = m.normalScale.y;

             } else {

                 floatArray[index ++] = 1;
                 floatArray[index ++] = 1;

             }

            // clearcoat
            floatArray[index ++] = getField(m, 'clearcoat', 0.0);
            floatArray[index ++] = getTexture(m, 'clearcoatMap'); // sample 5

            floatArray[index ++] = getField(m, 'clearcoatRoughness', 0.0);
            floatArray[index ++] = getTexture(m, 'clearcoatRoughnessMap');

            floatArray[index ++] = getTexture(m, 'clearcoatNormalMap');

            // sample 6
            if ('clearcoatNormalScale' in m) {

                floatArray[index ++] = m.clearcoatNormalScale.x;
                floatArray[index ++] = m.clearcoatNormalScale.y;

            } else {

                floatArray[index ++] = 1;
                floatArray[index ++] = 1;

            }

            index ++;
            index ++;

            // sample 7
            // sheen
            if ('sheenColor' in m) {

                floatArray[index ++] = m.sheenColor.r;
                floatArray[index ++] = m.sheenColor.g;
                floatArray[index ++] = m.sheenColor.b;

            } else {

                floatArray[index ++] = 0.0;
                floatArray[index ++] = 0.0;
                floatArray[index ++] = 0.0;

            }

            floatArray[index ++] = getTexture(m, 'sheenColorMap');

            // sample 8
            floatArray[index ++] = getField(m, 'sheenRoughness', 0.0);
            floatArray[index ++] = getTexture(m, 'sheenRoughnessMap');

            // iridescence
            floatArray[index ++] = getTexture(m, 'iridescenceMap');
            floatArray[index ++] = getTexture(m, 'iridescenceThicknessMap');

            floatArray[index ++] = getField(m, 'iridescence', 0.0); // sample 9
            floatArray[index ++] = getField(m, 'iridescenceIOR', 1.3);

            const iridescenceThicknessRange = getField(m, 'iridescenceThicknessRange', [100, 400]);
            floatArray[index ++] = iridescenceThicknessRange[0];
            floatArray[index ++] = iridescenceThicknessRange[1];

            // sample 10
            // specular color
            if ('specularColor' in m) {

                floatArray[index ++] = m.specularColor.r;
                floatArray[index ++] = m.specularColor.g;
                floatArray[index ++] = m.specularColor.b;

            } else {

                floatArray[index ++] = 1.0;
                floatArray[index ++] = 1.0;
                floatArray[index ++] = 1.0;

            }

            floatArray[index ++] = getTexture(m, 'specularColorMap');

            // sample 11
            // specular intensity
            floatArray[index ++] = getField(m, 'specularIntensity', 1.0);
            floatArray[index ++] = getTexture(m, 'specularIntensityMap');

            // thickness
            floatArray[index ++] = getField(m, 'thickness', 0.0) === 0.0 && getField(m, 'attenuationDistance', Infinity) === Infinity;
            index ++;

            // sample 12
            if ('attenuationColor' in m) {

                floatArray[index ++] = m.attenuationColor.r;
                floatArray[index ++] = m.attenuationColor.g;
                floatArray[index ++] = m.attenuationColor.b;

            } else {

                floatArray[index ++] = 1.0;
                floatArray[index ++] = 1.0;
                floatArray[index ++] = 1.0;

            }

            floatArray[index ++] = getField(m, 'attenuationDistance', Infinity);

            // sample 13
            // alphaMap
            floatArray[index ++] = getTexture(m, 'alphaMap');

            // side & matte
            floatArray[index ++] = m.opacity;
            floatArray[index ++] = m.alphaTest;
            index ++; // side

            // sample 14
            index ++; // matte
            index ++; // shadow
            floatArray[index ++] = Number(m.vertexColors); // vertexColors
            floatArray[index ++] = Number(m.transparent); // transparent

            // map transform 15
            index += writeTextureMatrixToArray(m, 'map', floatArray, index);

            // metalnessMap transform 17
            index += writeTextureMatrixToArray(m, 'metalnessMap', floatArray, index);

            // roughnessMap transform 19
            index += writeTextureMatrixToArray(m, 'roughnessMap', floatArray, index);

            // transmissionMap transform 21
            index += writeTextureMatrixToArray(m, 'transmissionMap', floatArray, index);

            // emissiveMap transform 22
            index += writeTextureMatrixToArray(m, 'emissiveMap', floatArray, index);

            // normalMap transform 25
            index += writeTextureMatrixToArray(m, 'normalMap', floatArray, index);

            // clearcoatMap transform 27
            index += writeTextureMatrixToArray(m, 'clearcoatMap', floatArray, index);

            // clearcoatNormalMap transform 29
            index += writeTextureMatrixToArray(m, 'clearcoatNormalMap', floatArray, index);

            // clearcoatRoughnessMap transform 31
            index += writeTextureMatrixToArray(m, 'clearcoatRoughnessMap', floatArray, index);

            // sheenColorMap transform 33
            index += writeTextureMatrixToArray(m, 'sheenColorMap', floatArray, index);

            // sheenRoughnessMap transform 35
            index += writeTextureMatrixToArray(m, 'sheenRoughnessMap', floatArray, index);

            // iridescenceMap transform 37
            index += writeTextureMatrixToArray(m, 'iridescenceMap', floatArray, index);

            // iridescenceThicknessMap transform 39
            index += writeTextureMatrixToArray(m, 'iridescenceThicknessMap', floatArray, index);

            // specularColorMap transform 41
            index += writeTextureMatrixToArray(m, 'specularColorMap', floatArray, index);

            // specularIntensityMap transform 43
            index += writeTextureMatrixToArray(m, 'specularIntensityMap', floatArray, index);

        }

        this.needsUpdate = true;

    }

}

const prevColor$1 = new Color();
class RenderTarget2DArray extends WebGLArrayRenderTarget {

    constructor(...args) {

        super(...args);

        const tex = this.texture;
        tex.format = RGBAFormat;
        tex.type = UnsignedByteType;
        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        tex.wrapS = RepeatWrapping;
        tex.wrapT = RepeatWrapping;
        tex.setTextures = (...args) => {

            this.setTextures(...args);

        };

        const fsQuad = new FullScreenQuad(new MeshBasicMaterial());
        this.fsQuad = fsQuad;

    }

    setTextures(renderer, width, height, textures) {

        // save previous renderer state
        const prevRenderTarget = renderer.getRenderTarget();
        const prevToneMapping = renderer.toneMapping;
        const prevAlpha = renderer.getClearAlpha();
        renderer.getClearColor(prevColor$1);

        // resize the render target and ensure we don't have an empty texture
        // render target depth must be >= 1 to avoid unbound texture error on android devices
        const depth = textures.length || 1;
        this.setSize(width, height, depth);
        renderer.setClearColor(0, 0);
        renderer.toneMapping = NoToneMapping;

        // render each texture into each layer of the target
        const fsQuad = this.fsQuad;
        for (let i = 0, l = depth; i < l; i++) {

            const texture = textures[i];
            if (texture) {

                // revert to default texture transform before rendering
                texture.matrixAutoUpdate = false;
                texture.matrix.identity();

                fsQuad.material.map = texture;
                fsQuad.material.transparent = true;

                renderer.setRenderTarget(this, i);
                fsQuad.render(renderer);

                // restore custom texture transform
                texture.updateMatrix();
                texture.matrixAutoUpdate = true;

            }

        }

        // reset the renderer
        fsQuad.material.map = null;
        renderer.setClearColor(prevColor$1, prevAlpha);
        renderer.setRenderTarget(prevRenderTarget);
        renderer.toneMapping = prevToneMapping;

    }

    dispose() {

        super.dispose();
        this.fsQuad.dispose();

    }

}

function binarySearchFindClosestIndexOf(array, targetValue, offset = 0, count = array.length) {

    let lower = 0;
    let upper = count;
    while (lower < upper) {

        const mid = ~ ~ (0.5 * upper + 0.5 * lower);


        // check if the middle array value is above or below the target and shift
        // which half of the array we're looking at
        if (array[offset + mid] < targetValue) {

            lower = mid + 1;

        } else {

            upper = mid;

        }

    }

    return lower;

}

function colorToLuminance(r, g, b) {

    // https://en.wikipedia.org/wiki/Relative_luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;

}

// ensures the data is all floating point values and flipY is false
function preprocessEnvMap(envMap) {

    const map = envMap.clone();
    map.source = new Source({ ...map.image });
    const { width, height, data } = map.image;

    // TODO: is there a simple way to avoid cloning and adjusting the env map data here?
    // convert the data from half float uint 16 arrays to float arrays for cdf computation
    let newData = data;
    if (map.type === HalfFloatType) {

        newData = new Float32Array(data.length);
        for (const i in data) {

            newData[i] = DataUtils.fromHalfFloat(data[i]);

        }

        map.image.data = newData;
        map.type = FloatType;

    }

    // remove any y flipping for cdf computation
    if (map.flipY) {

        const ogData = newData;
        newData = newData.slice();
        for (let y = 0; y < height; y ++) {

            for (let x = 0; x < width; x ++) {

                const newY = height - y - 1;
                const ogIndex = 4 * (y * width + x);
                const newIndex = 4 * (newY * width + x);

                newData[newIndex + 0] = ogData[ogIndex + 0];
                newData[newIndex + 1] = ogData[ogIndex + 1];
                newData[newIndex + 2] = ogData[ogIndex + 2];
                newData[newIndex + 3] = ogData[ogIndex + 3];

            }

        }

        map.flipY = false;
        map.image.data = newData;

    }

    return map;

}

class EquirectHdrInfoUniform {

    constructor() {

        // Stores a map of [0, 1] value -> cumulative importance row & pdf
        // used to sampling a random value to a relevant row to sample from
        const marginalWeights = new DataTexture();
        marginalWeights.type = FloatType;
        marginalWeights.format = RedFormat;
        marginalWeights.minFilter = LinearFilter;
        marginalWeights.magFilter = LinearFilter;
        marginalWeights.generateMipmaps = false;

        // Stores a map of [0, 1] value -> cumulative importance column & pdf
        // used to sampling a random value to a relevant pixel to sample from
        const conditionalWeights = new DataTexture();
        conditionalWeights.type = FloatType;
        conditionalWeights.format = RedFormat;
        conditionalWeights.minFilter = LinearFilter;
        conditionalWeights.magFilter = LinearFilter;
        conditionalWeights.generateMipmaps = false;

        this.marginalWeights = marginalWeights;
        this.conditionalWeights = conditionalWeights;
        this.map = null;

        // the total sum value is separated into two values to work around low precision
        // storage of floating values in structs
        this.totalSumWhole = 0;
        this.totalSumDecimal = 0;

    }

    dispose() {

        this.marginalWeights.dispose();
        this.conditionalWeights.dispose();
        if (this.map) this.map.dispose();

    }

    updateFrom(hdr) {

        // https://github.com/knightcrawler25/GLSL-PathTracer/blob/3c6fd9b6b3da47cd50c527eeb45845eef06c55c3/src/loaders/hdrloader.cpp
        // https://pbr-book.org/3ed-2018/Light_Transport_I_Surface_Reflection/Sampling_Light_Sources#InfiniteAreaLights
        const map = preprocessEnvMap(hdr);
        map.wrapS = RepeatWrapping;
        map.wrapT = RepeatWrapping;

        const { width, height, data } = map.image;

        // "conditional" = "pixel relative to row pixels sum"
        // "marginal" = "row relative to row sum"

        // track the importance of any given pixel in the image by tracking its weight relative to other pixels in the image
        const pdfConditional = new Float32Array(width * height);
        const cdfConditional = new Float32Array(width * height);

        const pdfMarginal = new Float32Array(height);
        const cdfMarginal = new Float32Array(height);

        let totalSumValue = 0.0;
        let cumulativeWeightMarginal = 0.0;
        for (let y = 0; y < height; y ++) {

            let cumulativeRowWeight = 0.0;
            for (let x = 0; x < width; x ++) {

                const i = y * width + x;
                const r = data[4 * i + 0];
                const g = data[4 * i + 1];
                const b = data[4 * i + 2];

                // the probability of the pixel being selected in this row is the
                // scale of the luminance relative to the rest of the pixels.
                // TODO: this should also account for the solid angle of the pixel when sampling
                const weight = colorToLuminance(r, g, b);
                cumulativeRowWeight += weight;
                totalSumValue += weight;

                pdfConditional[i] = weight;
                cdfConditional[i] = cumulativeRowWeight;

            }

            // can happen if the row is all black
            if (cumulativeRowWeight !== 0) {

                // scale the pdf and cdf to [0.0, 1.0]
                for (let i = y * width, l = y * width + width; i < l; i++) {

                    pdfConditional[i] /= cumulativeRowWeight;
                    cdfConditional[i] /= cumulativeRowWeight;

                }

            }

            cumulativeWeightMarginal += cumulativeRowWeight;

            // compute the marginal pdf and cdf along the height of the map.
            pdfMarginal[y] = cumulativeRowWeight;
            cdfMarginal[y] = cumulativeWeightMarginal;

        }

        // can happen if the texture is all black
        if (cumulativeWeightMarginal !== 0) {

            // scale the marginal pdf and cdf to [0.0, 1.0]
            for (let i = 0, l = pdfMarginal.length; i < l; i++) {

                pdfMarginal[i] /= cumulativeWeightMarginal;
                cdfMarginal[i] /= cumulativeWeightMarginal;

            }

        }

        // compute a sorted index of distributions and the probabilities along them for both
        // the marginal and conditional data. These will be used to sample with a random number
        // to retrieve a uv value to sample in the environment map.
        // These values continually increase so it's okay to interpolate between them.
        const marginalDataArray = new Float32Array(height);
        const conditionalDataArray = new Float32Array(width * height);

        for (let i = 0; i < height; i++) {

            const dist = (i + 1) / height;
            const row = binarySearchFindClosestIndexOf(cdfMarginal, dist);

            marginalDataArray[i] = row / height;

        }

        for (let y = 0; y < height; y ++) {

            for (let x = 0; x < width; x ++) {

                const i = y * width + x;
                const dist = (x + 1) / width;
                const col = binarySearchFindClosestIndexOf(cdfConditional, dist, y * width, width);

                conditionalDataArray[i] = col / width;

            }

        }

        this.dispose();

        const { marginalWeights, conditionalWeights } = this;
        marginalWeights.image = { width: height, height: 1, data: marginalDataArray };
        marginalWeights.needsUpdate = true;

        conditionalWeights.image = { width, height, data: conditionalDataArray };
        conditionalWeights.needsUpdate = true;

        const totalSumWhole = ~ ~ totalSumValue;
        const totalSumDecimal = (totalSumValue - totalSumWhole);
        this.totalSumWhole = totalSumWhole;
        this.totalSumDecimal = totalSumDecimal;

        this.map = map;

    }

}

class PhysicalCameraUniform {

    constructor() {

        this.bokehSize = 0;
        this.apertureBlades = 0;
        this.apertureRotation = 0;
        this.focusDistance = 10;
        this.anamorphicRatio = 1;

    }

    updateFrom(camera) {

        if (camera instanceof PhysicalCamera) {

            this.bokehSize = camera.bokehSize;
            this.apertureBlades = camera.apertureBlades;
            this.apertureRotation = camera.apertureRotation;
            this.focusDistance = camera.focusDistance;
            this.anamorphicRatio = camera.anamorphicRatio;

        } else {

            this.bokehSize = 0;
            this.apertureRotation = 0;
            this.apertureBlades = 0;
            this.focusDistance = 10;
            this.anamorphicRatio = 1;

        }

    }

}

const LIGHT_PIXELS = 6;
const RECT_AREA_LIGHT = 0;
const CIRC_AREA_LIGHT = 1;
const SPOT_LIGHT = 2;
class LightsInfoUniformStruct {

    constructor() {

        const tex = new DataTexture(new Float32Array(4), 1, 1);
        tex.format = RGBAFormat;
        tex.type = FloatType;
        tex.wrapS = ClampToEdgeWrapping;
        tex.wrapT = ClampToEdgeWrapping;
        tex.generateMipmaps = false;

        this.tex = tex;
        this.count = 0;

    }

    updateFrom(lights, iesTextures = []) {

        const tex = this.tex;
        const pixelCount = Math.max(lights.length * LIGHT_PIXELS, 1);
        const dimension = Math.ceil(Math.sqrt(pixelCount));

        if (tex.image.width !== dimension) {

            tex.dispose();

            tex.image.data = new Float32Array(dimension * dimension * 4);
            tex.image.width = dimension;
            tex.image.height = dimension;

        }

        const floatArray = tex.image.data;

        const u = new Vector3();
        const v = new Vector3();
        const m = new Matrix4();
        const worldQuaternion = new Quaternion();
        const eye = new Vector3();
        const target = new Vector3();
        const up = new Vector3();

        for (let i = 0, l = lights.length; i < l; i++) {

            const l = lights[i];

            const baseIndex = i * LIGHT_PIXELS * 4;
            let index = 0;

            // sample 1
            // position
            l.getWorldPosition(v);
            floatArray[baseIndex + (index ++)] = v.x;
            floatArray[baseIndex + (index ++)] = v.y;
            floatArray[baseIndex + (index ++)] = v.z;

            // type
            let type = RECT_AREA_LIGHT;
            if (l.isRectAreaLight && l.isCircular) type = CIRC_AREA_LIGHT;
            else if (l.isSpotLight) type = SPOT_LIGHT;
            floatArray[baseIndex + (index ++)] = type;

            // sample 2
            // color
            floatArray[baseIndex + (index ++)] = l.color.r;
            floatArray[baseIndex + (index ++)] = l.color.g;
            floatArray[baseIndex + (index ++)] = l.color.b;

            // intensity
            floatArray[baseIndex + (index ++)] = l.intensity;

            l.getWorldQuaternion(worldQuaternion);

            if (l.isRectAreaLight) {

                // sample 3
                // u vector
                u.set(l.width, 0, 0).applyQuaternion(worldQuaternion);

                floatArray[baseIndex + (index ++)] = u.x;
                floatArray[baseIndex + (index ++)] = u.y;
                floatArray[baseIndex + (index ++)] = u.z;
                index ++;

                // sample 4
                // v vector
                v.set(0, l.height, 0).applyQuaternion(worldQuaternion);

                floatArray[baseIndex + (index ++)] = v.x;
                floatArray[baseIndex + (index ++)] = v.y;
                floatArray[baseIndex + (index ++)] = v.z;

                // area
                floatArray[baseIndex + (index ++)] = u.cross(v).length() * (l.isCircular ? (Math.PI / 4.0) : 1.0);

            } else if (l.isSpotLight) {

                const radius = l.radius;
                eye.setFromMatrixPosition(l.matrixWorld);
                target.setFromMatrixPosition(l.target.matrixWorld);
                m.lookAt(eye, target, up);
                worldQuaternion.setFromRotationMatrix(m);

                // sample 3
                // u vector
                u.set(1, 0, 0).applyQuaternion(worldQuaternion);

                floatArray[baseIndex + (index ++)] = u.x;
                floatArray[baseIndex + (index ++)] = u.y;
                floatArray[baseIndex + (index ++)] = u.z;
                index ++;

                // sample 4
                // v vector
                v.set(0, 1, 0).applyQuaternion(worldQuaternion);

                floatArray[baseIndex + (index ++)] = v.x;
                floatArray[baseIndex + (index ++)] = v.y;
                floatArray[baseIndex + (index ++)] = v.z;

                // area
                floatArray[baseIndex + (index ++)] = Math.PI * radius * radius;

                // sample 5
                // radius
                floatArray[baseIndex + (index ++)] = radius;

                // near
                floatArray[baseIndex + (index ++)] = l.shadow.camera.near;

                // decay
                floatArray[baseIndex + (index ++)] = l.decay;

                // distance
                floatArray[baseIndex + (index ++)] = l.distance;

                // sample 6
                // coneCos
                floatArray[baseIndex + (index ++)] = Math.cos(l.angle);

                // penumbraCos
                floatArray[baseIndex + (index ++)] = Math.cos(l.angle * (1 - l.penumbra));

                // iesProfile
                floatArray[baseIndex + (index ++)] = iesTextures.indexOf(l.iesTexture);

            }

        }

        tex.needsUpdate = true;
        this.count = lights.length;

    }

}

function IESLamp(text) {

    const _self = this;

    const textArray = text.split('\n');

    let lineNumber = 0;
    let line;

    _self.verAngles = [];
    _self.horAngles = [];

    _self.candelaValues = [];

    _self.tiltData = { };
    _self.tiltData.angles = [];
    _self.tiltData.mulFactors = [];

    function textToArray(text) {

        text = text.replace(/^\s+|\s+$/g, ''); // remove leading or trailing spaces
        text = text.replace(/,/g, ' '); // replace commas with spaces
        text = text.replace(/\s\s+/g, ' '); // replace white space/tabs etc by single whitespace

        const array = text.split(' ');

        return array;

    }

    function readArray(count, array) {

        while (true) {

            const line = textArray[lineNumber ++];
            const lineData = textToArray(line);

            for (let i = 0; i < lineData.length; ++ i) {

                array.push(Number(lineData[i]));

            }

            if (array.length === count)
                break;

        }

    }

    function readTilt() {

        let line = textArray[lineNumber ++];
        let lineData = textToArray(line);

        _self.tiltData.lampToLumGeometry = Number(lineData[0]);

        line = textArray[lineNumber ++];
        lineData = textToArray(line);

        _self.tiltData.numAngles = Number(lineData[0]);

        readArray(_self.tiltData.numAngles, _self.tiltData.angles);
        readArray(_self.tiltData.numAngles, _self.tiltData.mulFactors);

    }

    function readLampValues() {

        const values = [];
        readArray(10, values);

        _self.count = Number(values[0]);
        _self.lumens = Number(values[1]);
        _self.multiplier = Number(values[2]);
        _self.numVerAngles = Number(values[3]);
        _self.numHorAngles = Number(values[4]);
        _self.gonioType = Number(values[5]);
        _self.units = Number(values[6]);
        _self.width = Number(values[7]);
        _self.length = Number(values[8]);
        _self.height = Number(values[9]);

    }

    function readLampFactors() {

        const values = [];
        readArray(3, values);

        _self.ballFactor = Number(values[0]);
        _self.blpFactor = Number(values[1]);
        _self.inputWatts = Number(values[2]);

    }

    while (true) {

        line = textArray[lineNumber ++];

        if (line.includes('TILT')) {

            break;

        }

    }

    if (!line.includes('NONE')) {

        if (line.includes('INCLUDE')) {

            readTilt();

        } else {

            // TODO:: Read tilt data from a file

        }

    }

    readLampValues();

    readLampFactors();

    // Initialize candela value array
    for (let i = 0; i < _self.numHorAngles; ++ i) {

        _self.candelaValues.push([]);

    }

    // Parse Angles
    readArray(_self.numVerAngles, _self.verAngles);
    readArray(_self.numHorAngles, _self.horAngles);

    // Parse Candela values
    for (let i = 0; i < _self.numHorAngles; ++ i) {

        readArray(_self.numVerAngles, _self.candelaValues[i]);

    }

    // Calculate actual candela values, and normalize.
    for (let i = 0; i < _self.numHorAngles; ++ i) {

        for (let j = 0; j < _self.numVerAngles; ++ j) {

            _self.candelaValues[i][j] *= _self.candelaValues[i][j] * _self.multiplier
                * _self.ballFactor * _self.blpFactor;

        }

    }

    let maxVal = -1;
    for (let i = 0; i < _self.numHorAngles; ++ i) {

        for (let j = 0; j < _self.numVerAngles; ++ j) {

            const value = _self.candelaValues[i][j];
            maxVal = maxVal < value ? value : maxVal;

        }

    }

    const bNormalize = true;
    if (bNormalize && maxVal > 0) {

        for (let i = 0; i < _self.numHorAngles; ++ i) {

            for (let j = 0; j < _self.numVerAngles; ++ j) {

                _self.candelaValues[i][j] /= maxVal;

            }

        }

    }

}

class IESLoader extends Loader {

    _getIESValues(iesLamp) {

        const width = 360;
        const height = 180;
        const size = width * height;

        const data = new Float32Array(size);

        function interpolateCandelaValues(phi, theta) {

            let phiIndex = 0, thetaIndex = 0;
            let startTheta = 0, endTheta = 0, startPhi = 0, endPhi = 0;

            for (let i = 0; i < iesLamp.numHorAngles - 1; ++ i) { // numHorAngles = horAngles.length-1 because of extra padding, so this wont cause an out of bounds error

                if (theta < iesLamp.horAngles[i + 1] || i == iesLamp.numHorAngles - 2) {

                    thetaIndex = i;
                    startTheta = iesLamp.horAngles[i];
                    endTheta = iesLamp.horAngles[i + 1];

                    break;

                }

            }

            for (let i = 0; i < iesLamp.numVerAngles - 1; ++ i) {

                if (phi < iesLamp.verAngles[i + 1] || i == iesLamp.numVerAngles - 2) {

                    phiIndex = i;
                    startPhi = iesLamp.verAngles[i];
                    endPhi = iesLamp.verAngles[i + 1];

                    break;

                }

            }

            const deltaTheta = endTheta - startTheta;
            const deltaPhi = endPhi - startPhi;

            if (deltaPhi === 0) // Outside range
                return 0;

            const t1 = deltaTheta === 0 ? 0 : (theta - startTheta) / deltaTheta;
            const t2 = (phi - startPhi) / deltaPhi;

            const nextThetaIndex = deltaTheta === 0 ? thetaIndex : thetaIndex + 1;

            const v1 = MathUtils.lerp(iesLamp.candelaValues[thetaIndex][phiIndex], iesLamp.candelaValues[nextThetaIndex][phiIndex], t1);
            const v2 = MathUtils.lerp(iesLamp.candelaValues[thetaIndex][phiIndex + 1], iesLamp.candelaValues[nextThetaIndex][phiIndex + 1], t1);
            const v = MathUtils.lerp(v1, v2, t2);

            return v;

        }

        const startTheta = iesLamp.horAngles[0], endTheta = iesLamp.horAngles[iesLamp.numHorAngles - 1];
        for (let i = 0; i < size; ++ i) {

            let theta = i % width;
            const phi = Math.floor(i / width);

            if (endTheta - startTheta !== 0 && (theta < startTheta || theta >= endTheta)) { // Handle symmetry for hor angles

                theta %= endTheta * 2;
                if (theta > endTheta)
                    theta = endTheta * 2 - theta;

            }

            data[i] = interpolateCandelaValues(phi, theta);

        }

        return data;

    }

    load(url, onLoad, onProgress, onError) {

        const loader = new FileLoader(this.manager);
        loader.setResponseType('text');
        loader.setCrossOrigin(this.crossOrigin);
        loader.setWithCredentials(this.withCredentials);
        loader.setPath(this.path);
        loader.setRequestHeader(this.requestHeader);

        const texture = new DataTexture(null, 360, 180, RedFormat, FloatType);
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;

        loader.load(url, text => {

            const iesLamp = new IESLamp(text);

            texture.image.data = this._getIESValues(iesLamp);
            texture.needsUpdate = true;

            if (onLoad !== undefined) {

                onLoad(texture);

            }

        }, onProgress, onError);

        return texture;

    }

    parse(text) {

        const iesLamp = new IESLamp(text);
        const texture = new DataTexture(null, 360, 180, RedFormat, FloatType);
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.image.data = this._getIESValues(iesLamp);
        texture.needsUpdate = true;

        return texture;

    }

}

const prevColor = new Color();
class IESProfilesTexture extends WebGLArrayRenderTarget {

    constructor(...args) {

        super(...args);

        const tex = this.texture;
        tex.format = RGBAFormat;
        tex.type = FloatType;
        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        tex.wrapS = ClampToEdgeWrapping;
        tex.wrapT = ClampToEdgeWrapping;
        tex.generateMipmaps = false;

        tex.updateFrom = (...args) => {

            this.updateFrom(...args);

        };

        const fsQuad = new FullScreenQuad(new MeshBasicMaterial());
        this.fsQuad = fsQuad;

        this.iesLoader = new IESLoader();

    }

    async updateFrom(renderer, textures) {

        // save previous renderer state
        const prevRenderTarget = renderer.getRenderTarget();
        const prevToneMapping = renderer.toneMapping;
        const prevAlpha = renderer.getClearAlpha();
        renderer.getClearColor(prevColor);

        // resize the render target and ensure we don't have an empty texture
        // render target depth must be >= 1 to avoid unbound texture error on android devices
        const depth = textures.length || 1;
        this.setSize(360, 180, depth);
        renderer.setClearColor(0, 0);
        renderer.toneMapping = NoToneMapping;

        // render each texture into each layer of the target
        const fsQuad = this.fsQuad;
        for (let i = 0, l = depth; i < l; i++) {

            const texture = textures[i];
            if (texture) {

                // revert to default texture transform before rendering
                texture.matrixAutoUpdate = false;
                texture.matrix.identity();

                fsQuad.material.map = texture;
                fsQuad.material.transparent = true;

                renderer.setRenderTarget(this, i);
                fsQuad.render(renderer);

                // restore custom texture transform
                texture.updateMatrix();
                texture.matrixAutoUpdate = true;

            }

        }

        // reset the renderer
        fsQuad.material.map = null;
        renderer.setClearColor(prevColor, prevAlpha);
        renderer.setRenderTarget(prevRenderTarget);
        renderer.toneMapping = prevToneMapping;

        fsQuad.dispose();

    }

    dispose() {

        super.dispose();
        this.fsQuad.dispose();

    }

}

const shaderUtils = /* glsl */`

    // https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_volume/README.md#attenuation
    vec3 transmissionAttenuation(float dist, vec3 attColor, float attDist) {

        vec3 ot = - log(attColor) / attDist;
        return exp(- ot * dist);

    }

    // https://google.github.io/filament/Filament.md.html#materialsystem/diffusebrdf
    float schlickFresnel(float cosine, float f0) {

        return f0 + (1.0 - f0) * pow(1.0 - cosine, 5.0);

    }

    vec3 schlickFresnel(float cosine, vec3 f0) {

        return f0 + (1.0 - f0) * pow(1.0 - cosine, 5.0);

    }

    // https://raytracing.github.io/books/RayTracingInOneWeekend.html#dielectrics/schlickapproximation
    float iorRatioToF0(float iorRatio) {

        return pow((1.0 - iorRatio) / (1.0 + iorRatio), 2.0);

    }

    float schlickFresnelFromIor(float cosine, float iorRatio) {

        // Schlick approximation
        float r_0 = iorRatioToF0(iorRatio);
        return schlickFresnel(cosine, r_0);

    }

    // forms a basis with the normal vector as Z
    mat3 getBasisFromNormal(vec3 normal) {

        vec3 other;
        if (abs(normal.x) > 0.5) {

            other = vec3(0.0, 1.0, 0.0);

        } else {

            other = vec3(1.0, 0.0, 0.0);

        }

        vec3 ortho = normalize(cross(normal, other));
        vec3 ortho2 = normalize(cross(normal, ortho));
        return mat3(ortho2, ortho, normal);

    }

    vec3 getHalfVector(vec3 a, vec3 b) {

        return normalize(a + b);

    }

    // The discrepancy between interpolated surface normal and geometry normal can cause issues when a ray
    // is cast that is on the top side of the geometry normal plane but below the surface normal plane. If
    // we find a ray like that we ignore it to avoid artifacts.
    // This function returns if the direction is on the same side of both planes.
    bool isDirectionValid(vec3 direction, vec3 surfaceNormal, vec3 geometryNormal) {

        bool aboveSurfaceNormal = dot(direction, surfaceNormal) > 0.0;
        bool aboveGeometryNormal = dot(direction, geometryNormal) > 0.0;
        return aboveSurfaceNormal == aboveGeometryNormal;

    }

    vec3 getHemisphereSample(vec3 n, vec2 uv) {

        // https://www.rorydriscoll.com/2009/01/07/better-sampling/
        // https://graphics.pixar.com/library/OrthonormalB/paper.pdf
        float sign = n.z == 0.0 ? 1.0 : sign(n.z);
        float a = -1.0 / (sign + n.z);
        float b = n.x * n.y * a;
        vec3 b1 = vec3(1.0 + sign * n.x * n.x * a, sign * b, - sign * n.x);
        vec3 b2 = vec3(b, sign + n.y * n.y * a, - n.y);

        float r = sqrt(uv.x);
        float theta = 2.0 * PI * uv.y;
        float x = r * cos(theta);
        float y = r * sin(theta);
        return x * b1 + y * b2 + sqrt(1.0 - uv.x) * n;

    }

    // https://www.shadertoy.com/view/wltcRS
    uvec4 s0;

    void rng_initialize(vec2 p, int frame) {

        // white noise seed
        s0 = uvec4(p, uint(frame), uint(p.x) + uint(p.y));

    }

    // https://www.pcg-random.org/
    void pcg4d(inout uvec4 v) {

        v = v * 1664525u + 1013904223u;
        v.x += v.y * v.w;
        v.y += v.z * v.x;
        v.z += v.x * v.y;
        v.w += v.y * v.z;
        v = v ^ (v >> 16u);
        v.x += v.y*v.w;
        v.y += v.z*v.x;
        v.z += v.x*v.y;
        v.w += v.y*v.z;

    }

    // returns [0, 1]
    float rand() {

        pcg4d(s0);
        return float(s0.x) / float(0xffffffffu);

    }

    vec2 rand2() {

        pcg4d(s0);
        return vec2(s0.xy) / float(0xffffffffu);

    }

    vec3 rand3() {

        pcg4d(s0);
        return vec3(s0.xyz) / float(0xffffffffu);

    }

    vec4 rand4() {

        pcg4d(s0);
        return vec4(s0)/float(0xffffffffu);

    }

    // https://github.com/mrdoob/three.js/blob/dev/src/math/Vector3.js#L724
    vec3 randDirection() {

        vec2 r = rand2();
        float u = (r.x - 0.5) * 2.0;
        float t = r.y * PI * 2.0;
        float f = sqrt(1.0 - u * u);

        return vec3(f * cos(t), f * sin(t), u);

    }

    vec2 triangleSample(vec2 a, vec2 b, vec2 c) {

        // get the edges of the triangle and the diagonal across the
        // center of the parallelogram
        vec2 e1 = a - b;
        vec2 e2 = c - b;
        vec2 diag = normalize(e1 + e2);

        // pick a random point in the parallelogram
        vec2 r = rand2();
        if (r.x + r.y > 1.0) {

            r = vec2(1.0) - r;

        }

        return e1 * r.x + e2 * r.y;

    }

    // samples an aperture shape with the given number of sides. 0 means circle
    vec2 sampleAperture(int blades) {

        if (blades == 0) {

            vec2 r = rand2();
            float angle = 2.0 * PI * r.x;
            float radius = sqrt(rand());
            return vec2(cos(angle), sin(angle)) * radius;

        } else {

            blades = max(blades, 3);

            vec3 r = rand3();
            float anglePerSegment = 2.0 * PI / float(blades);
            float segment = floor(float(blades) * r.x);

            float angle1 = anglePerSegment * segment;
            float angle2 = angle1 + anglePerSegment;
            vec2 a = vec2(sin(angle1), cos(angle1));
            vec2 b = vec2(0.0, 0.0);
            vec2 c = vec2(sin(angle2), cos(angle2));

            return triangleSample(a, b, c);

        }

    }

    float colorToLuminance(vec3 color) {

        // https://en.wikipedia.org/wiki/Relative_luminance
        return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;

    }

    // ray sampling x and z are swapped to align with expected background view
    vec2 equirectDirectionToUv(vec3 direction) {

        // from Spherical.setFromCartesianCoords
        vec2 uv = vec2(atan(direction.z, direction.x), acos(direction.y));
        uv /= vec2(2.0 * PI, PI);

        // apply adjustments to get values in range [0, 1] and y right side up
        uv.x += 0.5;
        uv.y = 1.0 - uv.y;
        return uv;

    }

    vec3 equirectUvToDirection(vec2 uv) {

        // undo above adjustments
        uv.x -= 0.5;
        uv.y = 1.0 - uv.y;

        // from Vector3.setFromSphericalCoords
        float theta = uv.x * 2.0 * PI;
        float phi = uv.y * PI;

        float sinPhi = sin(phi);

        return vec3(sinPhi * cos(theta), cos(phi), sinPhi * sin(theta));

    }

    // Fast arccos approximation used to remove banding artifacts caused by numerical errors in acos.
    // This is a cubic Lagrange interpolating polynomial for x = [-1, -1/2, 0, 1/2, 1].
    // For more information see: https://github.com/gkjohnson/three-gpu-pathtracer/pull/171#issuecomment-1152275248
    float acosApprox(float x) {

        x = clamp(x, -1.0, 1.0);
        return (- 0.69813170079773212 * x * x - 0.87266462599716477) * x + 1.5707963267948966;

    }

    // An acos with input values bound to the range [-1, 1].
    float acosSafe(float x) {

        return acos(clamp(x, -1.0, 1.0));

    }

    float saturateCos(float val) {

        return clamp(val, 0.001, 1.0);

    }

    float square(float t) {

        return t * t;

    }

    vec2 square(vec2 t) {

        return t * t;

    }

    vec3 square(vec3 t) {

        return t * t;

    }

    vec4 square(vec4 t) {

        return t * t;

    }

    // Finds the point where the ray intersects the plane defined by u and v and checks if this point
    // falls in the bounds of the rectangle on that same plane.
    // Plane intersection: https://lousodrome.net/blog/light/2020/07/03/intersection-of-a-ray-and-a-plane/
    bool intersectsRectangle(vec3 center, vec3 normal, vec3 u, vec3 v, vec3 rayOrigin, vec3 rayDirection, out float dist) {

        float t = dot(center - rayOrigin, normal) / dot(rayDirection, normal);

        if (t > EPSILON) {

            vec3 p = rayOrigin + rayDirection * t;
            vec3 vi = p - center;

            // check if p falls inside the rectangle
            float a1 = dot(u, vi);
            if (abs(a1) <= 0.5) {

                float a2 = dot(v, vi);
                if (abs(a2) <= 0.5) {

                    dist = t;
                    return true;

                }

            }

        }

        return false;

    }

    // Finds the point where the ray intersects the plane defined by u and v and checks if this point
    // falls in the bounds of the circle on that same plane. See above URL for a description of the plane intersection algorithm.
    bool intersectsCircle(vec3 position, vec3 normal, vec3 u, vec3 v, vec3 rayOrigin, vec3 rayDirection, out float dist) {

        float t = dot(position - rayOrigin, normal) / dot(rayDirection, normal);

        if (t > EPSILON) {

            vec3 hit = rayOrigin + rayDirection * t;
            vec3 vi = hit - position;

            float a1 = dot(u, vi);
            float a2 = dot(v, vi);

            if(length(vec2(a1, a2)) <= 0.5) {

                dist = t;
                return true;

            }

        }

        return false;

    }

    // power heuristic for multiple importance sampling
    float misHeuristic(float a, float b) {

        float aa = a * a;
        float bb = b * b;
        return aa / (aa + bb);

    }

`;

class PMREMCopyMaterial extends MaterialBase {

    constructor() {

        super({

            uniforms: {

                envMap: { value: null },
                blur: { value: 0 },

            },

            vertexShader: /* glsl */`

                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }

            `,

            fragmentShader: /* glsl */`

                #include <common>
                #include <cube_uv_reflection_fragment>

                ${ shaderUtils }

                uniform sampler2D envMap;
                uniform float blur;
                varying vec2 vUv;
                void main() {

                    vec3 rayDirection = equirectUvToDirection(vUv);
                    gl_FragColor = textureCubeUV(envMap, rayDirection, blur);

                }

            `,

        });

    }

}

class BlurredEnvMapGenerator {

    constructor(renderer) {

        this.renderer = renderer;
        this.pmremGenerator = new PMREMGenerator(renderer);
        this.copyQuad = new FullScreenQuad(new PMREMCopyMaterial());
        this.renderTarget = new WebGLRenderTarget(1, 1, { type: FloatType, format: RGBAFormat });

    }

    dispose() {

        this.pmremGenerator.dispose();
        this.copyQuad.dispose();
        this.renderTarget.dispose();

    }

    generate(texture, blur) {

        const { pmremGenerator, renderTarget, copyQuad, renderer } = this;

        // get the pmrem target
        const pmremTarget = pmremGenerator.fromEquirectangular(texture);

        // set up the material
        const { width, height } = texture.image;
        renderTarget.setSize(width, height);
        copyQuad.material.envMap = pmremTarget.texture;
        copyQuad.material.blur = blur;

        // render
        const prevRenderTarget = renderer.getRenderTarget();
        const prevClear = renderer.autoClear;

        renderer.setRenderTarget(renderTarget);
        renderer.autoClear = true;
        copyQuad.render(renderer);

        renderer.setRenderTarget(prevRenderTarget);
        renderer.autoClear = prevClear;

        // read the data back
        const buffer = new Float32Array(width * height * 4);
        renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);

        const result = new DataTexture(buffer, width, height, RGBAFormat, FloatType);
        result.minFilter = texture.minFilter;
        result.magFilter = texture.magFilter;
        result.wrapS = texture.wrapS;
        result.wrapT = texture.wrapT;
        result.mapping = EquirectangularReflectionMapping;
        result.needsUpdate = true;

        return result;

    }

}

class DenoiseMaterial extends MaterialBase {

    constructor(parameters) {

        super({

            blending: NoBlending,

            transparent: false,

            depthWrite: false,

            depthTest: false,

            defines: {

                USE_SLIDER: 0,

            },

            uniforms: {

                sigma: { value: 5.0 },
                threshold: { value: 0.03 },
                kSigma: { value: 1.0 },

                map: { value: null },

            },

            vertexShader: /* glsl */`

                varying vec2 vUv;

                void main() {

                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

                }

            `,

            fragmentShader: /* glsl */`

                //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                //  Copyright (c) 2018-2019 Michele Morrone
                //  All rights reserved.
                //
                //  https://michelemorrone.eu - https://BrutPitt.com
                //
                //  me@michelemorrone.eu - brutpitt@gmail.com
                //  twitter: @BrutPitt - github: BrutPitt
                //
                //  https://github.com/BrutPitt/glslSmartDeNoise/
                //
                //  This software is distributed under the terms of the BSD 2-Clause license
                //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

                uniform sampler2D map;

                uniform float sigma;
                uniform float threshold;
                uniform float kSigma;

                varying vec2 vUv;

                #define INV_SQRT_OF_2PI 0.39894228040143267793994605993439
                #define INV_PI 0.31830988618379067153776752674503

                // Parameters:
                //     sampler2D tex     - sampler image / texture
                //     vec2 uv           - actual fragment coord
                //     float sigma  >  0 - sigma Standard Deviation
                //     float kSigma >= 0 - sigma coefficient
                //         kSigma * sigma  -->  radius of the circular kernel
                //     float threshold   - edge sharpening threshold
                vec4 smartDeNoise(sampler2D tex, vec2 uv, float sigma, float kSigma, float threshold) {

                    float radius = round(kSigma * sigma);
                    float radQ = radius * radius;

                    float invSigmaQx2 = 0.5 / (sigma * sigma);
                    float invSigmaQx2PI = INV_PI * invSigmaQx2;

                    float invThresholdSqx2 = 0.5 / (threshold * threshold);
                    float invThresholdSqrt2PI = INV_SQRT_OF_2PI / threshold;

                    vec4 centrPx = texture2D(tex, uv);
                    centrPx.rgb *= centrPx.a;

                    float zBuff = 0.0;
                    vec4 aBuff = vec4(0.0);
                    vec2 size = vec2(textureSize(tex, 0));

                    vec2 d;
                    for (d.x = -radius; d.x <= radius; d.x ++) {

                        float pt = sqrt(radQ - d.x * d.x);

                        for (d.y = - pt; d.y <= pt; d.y ++) {

                            float blurFactor = exp(- dot(d, d) * invSigmaQx2) * invSigmaQx2PI;

                            vec4 walkPx = texture2D(tex, uv + d / size);
                            walkPx.rgb *= walkPx.a;

                            vec4 dC = walkPx - centrPx;
                            float deltaFactor = exp(- dot(dC.rgba, dC.rgba) * invThresholdSqx2) * invThresholdSqrt2PI * blurFactor;

                            zBuff += deltaFactor;
                            aBuff += deltaFactor * walkPx;

                        }

                    }

                    return aBuff / zBuff;

                }

                void main() {

                    gl_FragColor = smartDeNoise(map, vec2(vUv.x, vUv.y), sigma, kSigma, threshold);
                    #include <tonemapping_fragment>
                    #include <encodings_fragment>
                    #include <premultiplied_alpha_fragment>

                }

            `

        });

        this.setValues(parameters);

    }

}

class GraphMaterial extends MaterialBase {

    get graphFunctionSnippet() {

        return this._graphFunctionSnippet;

    }

    set graphFunctionSnippet(v) {

        this._graphFunctionSnippet = v;

    }

    constructor(parameters) {

        super({

            blending: NoBlending,

            transparent: false,

            depthWrite: false,

            depthTest: false,

            defines: {

                USE_SLIDER: 0,

            },

            uniforms: {

                dim: { value: true },
                thickness: { value: 1 },
                graphCount: { value: 4 },
                graphDisplay: { value: new Vector4(1.0, 1.0, 1.0, 1.0) },
                overlay: { value: true },
                xRange: { value: new Vector2(- 2.0, 2.0) },
                yRange: { value: new Vector2(- 2.0, 2.0) },
                colors: { value: [
                    new Color(0xe91e63).convertSRGBToLinear(),
                    new Color(0x4caf50).convertSRGBToLinear(),
                    new Color(0x03a9f4).convertSRGBToLinear(),
                    new Color(0xffc107).convertSRGBToLinear(),
                ] },

            },

            vertexShader: /* glsl */`

                varying vec2 vUv;

                void main() {

                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

                }

            `,

            fragmentShader: /* glsl */`
                varying vec2 vUv;
                uniform bool overlay;
                uniform bool dim;
                uniform bvec4 graphDisplay;
                uniform float graphCount;
                uniform float thickness;
                uniform vec2 xRange;
                uniform vec2 yRange;
                uniform vec3 colors[4];

                __FUNCTION_CONTENT__

                float map(float _min, float _max, float v) {

                    float len = _max - _min;
                    return _min + len * v;

                }

                vec3 getBackground(vec2 point, float steepness) {

                    vec2 pw = fwidth(point);
                    vec2 halfWidth = pw * 0.5;

                    // x, y axes
                    vec2 distToZero = smoothstep(
                        - halfWidth * 0.5,
                        halfWidth * 0.5,
                        abs(point.xy) - pw
                    );

                    // 1 unit markers
                    vec2 temp;
                    vec2 modAxis = abs(modf(point + vec2(0.5), temp)) -0.5;
                    vec2 distToAxis = smoothstep(
                        - halfWidth,
                        halfWidth,
                        abs(modAxis.xy) - pw * 0.5
                    );

                    // if we're at a chart boundary then remove the artifacts
                    if (abs(pw.y) > steepness * 0.5) {

                        distToZero.y = 1.0;
                        distToAxis.y = 1.0;

                    }

                    // mix colors into a background color
                    float axisIntensity = 1.0 - min(distToZero.x, distToZero.y);
                    float markerIntensity = 1.0 - min(distToAxis.x, distToAxis.y);

                    vec3 markerColor = mix(vec3(0.005), vec3(0.05), markerIntensity);
                    vec3 backgroundColor = mix(markerColor, vec3(0.2), axisIntensity);
                    return backgroundColor;

                }

                void main() {

                    // from uniforms
                    float sectionCount = overlay ? 1.0 : graphCount;
                    float yWidth = abs(yRange.y - yRange.x);

                    // separate into sections
                    float _section;
                    float sectionY = modf(sectionCount * vUv.y, _section);
                    int section = int(sectionCount - _section - 1.0);

                    // get the current point
                    vec2 point = vec2(
                        map(xRange.x, xRange.y, vUv.x),
                        map(yRange.x, yRange.y, sectionY)
                    );

                    // get the results
                    vec4 result = graphFunction(point.x);
                    vec4 delta = result - vec4(point.y);
                    vec4 halfDdf = fwidth(delta) * 0.5;
                    if (fwidth(point.y) > yWidth * 0.5) {

                        halfDdf = vec4(0.0);

                    }

                    // graph display intensity
                    vec4 graph = smoothstep(-halfDdf, halfDdf, abs(delta) - thickness * halfDdf);

                    // initialize the background
                    gl_FragColor.rgb = getBackground(point, yWidth);
                    gl_FragColor.a = 1.0;

                    if (dim && (point.x < 0.0 || point.y < 0.0)) {

                        graph = mix(
                            vec4(1.0),
                            graph,
                            0.05
                        );

                    }

                    // color the charts
                    if (sectionCount > 1.0) {

                        if (graphDisplay[section]) {

                            gl_FragColor.rgb = mix(
                                colors[section],
                                gl_FragColor.rgb,
                                graph[section]
                            );

                        }

                    } else {

                        for (int i = 0; i < int(graphCount); i++) {

                            if (graphDisplay[i]) {

                                gl_FragColor.rgb = mix(
                                    colors[i],
                                    gl_FragColor.rgb,
                                    graph[i]
                                );

                            }

                        }

                    }

                    #include <encodings_fragment>

                }

            `

        });


        this._graphFunctionSnippet = /* glsl */`
            vec4 graphFunctionSnippet(float x) {

                return vec4(
                    sin(x * 3.1415926535),
                    cos(x),
                    0.0,
                    0.0
                );

            }
        `;

        this.setValues(parameters);

    }

    onBeforeCompile(shader) {

        shader.fragmentShader = shader.fragmentShader.replace(
            '__FUNCTION_CONTENT__',
            this._graphFunctionSnippet,
        );
        return shader;

    }

    customProgramCacheKey() {

        return this._graphFunctionSnippet;

    }

}

const shaderMaterialStructs = /* glsl */ `

    struct PhysicalCamera {

        float focusDistance;
        float anamorphicRatio;
        float bokehSize;
        int apertureBlades;
        float apertureRotation;

    };

    struct EquirectHdrInfo {

        sampler2D marginalWeights;
        sampler2D conditionalWeights;
        sampler2D map;

        float totalSumWhole;
        float totalSumDecimal;

    };

    struct Material {

        vec3 color;
        int map;

        float metalness;
        int metalnessMap;

        float roughness;
        int roughnessMap;

        float ior;
        float transmission;
        int transmissionMap;

        float emissiveIntensity;
        vec3 emissive;
        int emissiveMap;

        int normalMap;
        vec2 normalScale;

        float clearcoat;
        int clearcoatMap;
        int clearcoatNormalMap;
        vec2 clearcoatNormalScale;
        float clearcoatRoughness;
        int clearcoatRoughnessMap;

        int iridescenceMap;
        int iridescenceThicknessMap;
        float iridescence;
        float iridescenceIor;
        float iridescenceThicknessMinimum;
        float iridescenceThicknessMaximum;

        vec3 specularColor;
        int specularColorMap;

        float specularIntensity;
        int specularIntensityMap;
        bool thinFilm;

        vec3 attenuationColor;
        float attenuationDistance;

        int alphaMap;

        bool castShadow;
        float opacity;
        float alphaTest;

        float side;
        bool matte;

        vec3 sheenColor;
        int sheenColorMap;
        float sheenRoughness;
        int sheenRoughnessMap;

        bool vertexColors;
        bool transparent;

        mat3 mapTransform;
        mat3 metalnessMapTransform;
        mat3 roughnessMapTransform;
        mat3 transmissionMapTransform;
        mat3 emissiveMapTransform;
        mat3 normalMapTransform;
        mat3 clearcoatMapTransform;
        mat3 clearcoatNormalMapTransform;
        mat3 clearcoatRoughnessMapTransform;
        mat3 sheenColorMapTransform;
        mat3 sheenRoughnessMapTransform;
        mat3 iridescenceMapTransform;
        mat3 iridescenceThicknessMapTransform;
        mat3 specularColorMapTransform;
        mat3 specularIntensityMapTransform;

    };

    mat3 readTextureTransform(sampler2D tex, uint index) {

        mat3 textureTransform;

        vec4 row1 = texelFetch1D(tex, index);
        vec4 row2 = texelFetch1D(tex, index + 1u);

        textureTransform[0] = vec3(row1.r, row2.r, 0.0);
        textureTransform[1] = vec3(row1.g, row2.g, 0.0);
        textureTransform[2] = vec3(row1.b, row2.b, 1.0);

        return textureTransform;

    }

    Material readMaterialInfo(sampler2D tex, uint index) {

        uint i = index * 45u;

        vec4 s0 = texelFetch1D(tex, i + 0u);
        vec4 s1 = texelFetch1D(tex, i + 1u);
        vec4 s2 = texelFetch1D(tex, i + 2u);
        vec4 s3 = texelFetch1D(tex, i + 3u);
        vec4 s4 = texelFetch1D(tex, i + 4u);
        vec4 s5 = texelFetch1D(tex, i + 5u);
        vec4 s6 = texelFetch1D(tex, i + 6u);
        vec4 s7 = texelFetch1D(tex, i + 7u);
        vec4 s8 = texelFetch1D(tex, i + 8u);
        vec4 s9 = texelFetch1D(tex, i + 9u);
        vec4 s10 = texelFetch1D(tex, i + 10u);
        vec4 s11 = texelFetch1D(tex, i + 11u);
        vec4 s12 = texelFetch1D(tex, i + 12u);
        vec4 s13 = texelFetch1D(tex, i + 13u);
        vec4 s14 = texelFetch1D(tex, i + 14u);

        Material m;
        m.color = s0.rgb;
        m.map = int(round(s0.a));

        m.metalness = s1.r;
        m.metalnessMap = int(round(s1.g));
        m.roughness = s1.b;
        m.roughnessMap = int(round(s1.a));

        m.ior = s2.r;
        m.transmission = s2.g;
        m.transmissionMap = int(round(s2.b));
        m.emissiveIntensity = s2.a;

        m.emissive = s3.rgb;
        m.emissiveMap = int(round(s3.a));

        m.normalMap = int(round(s4.r));
        m.normalScale = s4.gb;

        m.clearcoat = s4.a;
        m.clearcoatMap = int(round(s5.r));
        m.clearcoatRoughness = s5.g;
        m.clearcoatRoughnessMap = int(round(s5.b));
        m.clearcoatNormalMap = int(round(s5.a));
        m.clearcoatNormalScale = s6.rg;

        m.sheenColor = s7.rgb;
        m.sheenColorMap = int(round(s7.a));
        m.sheenRoughness = s8.r;
        m.sheenRoughnessMap = int(round(s8.g));

        m.iridescenceMap = int(round(s8.b));
        m.iridescenceThicknessMap = int(round(s8.a));
        m.iridescence = s9.r;
        m.iridescenceIor = s9.g;
        m.iridescenceThicknessMinimum = s9.b;
        m.iridescenceThicknessMaximum = s9.a;

        m.specularColor = s10.rgb;
        m.specularColorMap = int(round(s10.a));

        m.specularIntensity = s11.r;
        m.specularIntensityMap = int(round(s11.g));
        m.thinFilm = bool(s11.b);

        m.attenuationColor = s12.rgb;
        m.attenuationDistance = s12.a;

        m.alphaMap = int(round(s13.r));

        m.opacity = s13.g;
        m.alphaTest = s13.b;
        m.side = s13.a;

        m.matte = bool(s14.r);
        m.castShadow = ! bool(s14.g);
        m.vertexColors = bool(s14.b);
        m.transparent = bool(s14.a);

        uint firstTextureTransformIdx = i + 15u;

        m.mapTransform = m.map == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx);
        m.metalnessMapTransform = m.metalnessMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 2u);
        m.roughnessMapTransform = m.roughnessMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 4u);
        m.transmissionMapTransform = m.transmissionMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 6u);
        m.emissiveMapTransform = m.emissiveMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 8u);
        m.normalMapTransform = m.normalMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 10u);
        m.clearcoatMapTransform = m.clearcoatMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 12u);
        m.clearcoatNormalMapTransform = m.clearcoatNormalMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 14u);
        m.clearcoatRoughnessMapTransform = m.clearcoatRoughnessMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 16u);
        m.sheenColorMapTransform = m.sheenColorMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 18u);
        m.sheenRoughnessMapTransform = m.sheenRoughnessMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 20u);
        m.iridescenceMapTransform = m.iridescenceMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 22u);
        m.iridescenceThicknessMapTransform = m.iridescenceThicknessMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 24u);
        m.specularColorMapTransform = m.specularColorMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 26u);
        m.specularIntensityMapTransform = m.specularIntensityMap == -1 ? mat3(0) : readTextureTransform(tex, firstTextureTransformIdx + 28u);

        return m;

    }

`;

const shaderLightStruct = /* glsl */ `

    #define RECT_AREA_LIGHT_TYPE 0
    #define CIRC_AREA_LIGHT_TYPE 1
    #define SPOT_LIGHT_TYPE 2

    struct LightsInfo {

        sampler2D tex;
        uint count;

    };

    struct Light {

        vec3 position;
        int type;

        vec3 color;
        float intensity;

        vec3 u;
        vec3 v;
        float area;

        // spot light fields
        float radius;
        float near;
        float decay;
        float distance;
        float coneCos;
        float penumbraCos;
        int iesProfile;

    };

    Light readLightInfo(sampler2D tex, uint index) {

        uint i = index * 6u;

        vec4 s0 = texelFetch1D(tex, i + 0u);
        vec4 s1 = texelFetch1D(tex, i + 1u);
        vec4 s2 = texelFetch1D(tex, i + 2u);
        vec4 s3 = texelFetch1D(tex, i + 3u);

        Light l;
        l.position = s0.rgb;
        l.type = int(round(s0.a));

        l.color = s1.rgb;
        l.intensity = s1.a;

        l.u = s2.rgb;
        l.v = s3.rgb;
        l.area = s3.a;

        if (l.type == SPOT_LIGHT_TYPE) {

            vec4 s4 = texelFetch1D(tex, i + 4u);
            vec4 s5 = texelFetch1D(tex, i + 5u);
            l.radius = s4.r;
            l.near = s4.g;
            l.decay = s4.b;
            l.distance = s4.a;

            l.coneCos = s5.r;
            l.penumbraCos = s5.g;
            l.iesProfile = int(round (s5.b));

        }

        return l;

    }

    struct SpotLight {

        vec3 position;
        int type;

        vec3 color;
        float intensity;

        vec3 u;
        vec3 v;
        float area;

        float radius;
        float near;
        float decay;
        float distance;
        float coneCos;
        float penumbraCos;
        int iesProfile;

    };

`;

const shaderGGXFunctions = /* glsl */`
// The GGX functions provide sampling and distribution information for normals as output so
// in order to get probability of scatter direction the half vector must be computed and provided.
// [0] https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf
// [1] https://hal.archives-ouvertes.fr/hal-01509746/document
// [2] http://jcgt.org/published/0007/04/01/
// [4] http://jcgt.org/published/0003/02/03/

// trowbridge-reitz === GGX === GTR

vec3 ggxDirection(vec3 incidentDir, float roughnessX, float roughnessY, float random1, float random2) {

    // TODO: try GGXVNDF implementation from reference [2], here. Needs to update ggxDistribution
    // function below, as well

    // Implementation from reference [1]
    // stretch view
    vec3 V = normalize(vec3(roughnessX * incidentDir.x, roughnessY * incidentDir.y, incidentDir.z));

    // orthonormal basis
    vec3 T1 = (V.z < 0.9999) ? normalize(cross(V, vec3(0.0, 0.0, 1.0))) : vec3(1.0, 0.0, 0.0);
    vec3 T2 = cross(T1, V);

    // sample point with polar coordinates (r, phi)
    float a = 1.0 / (1.0 + V.z);
    float r = sqrt(random1);
    float phi = (random2 < a) ? random2 / a * PI : PI + (random2 - a) / (1.0 - a) * PI;
    float P1 = r * cos(phi);
    float P2 = r * sin(phi) * ((random2 < a) ? 1.0 : V.z);

    // compute normal
    vec3 N = P1 * T1 + P2 * T2 + V * sqrt(max(0.0, 1.0 - P1 * P1 - P2 * P2));

    // unstretch
    N = normalize(vec3(roughnessX * N.x, roughnessY * N.y, max(0.0, N.z)));

    return N;

}

// Below are PDF and related functions for use in a Monte Carlo path tracer
// as specified in Appendix B of the following paper
// See equation (34) from reference [0]
float ggxLamda(float theta, float roughness) {

    float tanTheta = tan(theta);
    float tanTheta2 = tanTheta * tanTheta;
    float alpha2 = roughness * roughness;

    float numerator = -1.0 + sqrt(1.0 + alpha2 * tanTheta2);
    return numerator / 2.0;

}

// See equation (34) from reference [0]
float ggxShadowMaskG1(float theta, float roughness) {

    return 1.0 / (1.0 + ggxLamda(theta, roughness));

}

// See equation (125) from reference [4]
float ggxShadowMaskG2(vec3 wi, vec3 wo, float roughness) {

    float incidentTheta = acos(wi.z);
    float scatterTheta = acos(wo.z);
    return 1.0 / (1.0 + ggxLamda(incidentTheta, roughness) + ggxLamda(scatterTheta, roughness));

}

// See equation (33) from reference [0]
float ggxDistribution(vec3 halfVector, float roughness) {

    float a2 = roughness * roughness;
    a2 = max(EPSILON, a2);
    float cosTheta = halfVector.z;
    float cosTheta4 = pow(cosTheta, 4.0);

    if (cosTheta == 0.0) return 0.0;

    float theta = acosSafe(halfVector.z);
    float tanTheta = tan(theta);
    float tanTheta2 = pow(tanTheta, 2.0);

    float denom = PI * cosTheta4 * pow(a2 + tanTheta2, 2.0);
    return (a2 / denom);

}

// See equation (3) from reference [2]
float ggxPDF(vec3 wi, vec3 halfVector, float roughness) {

    float incidentTheta = acos(wi.z);
    float D = ggxDistribution(halfVector, roughness);
    float G1 = ggxShadowMaskG1(incidentTheta, roughness);

    return D * G1 * max(0.0, dot(wi, halfVector)) / wi.z;

}
`;

const shaderSheenFunctions = /* glsl */`

// See equation (2) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
float velvetD(float cosThetaH, float roughness) {

    float alpha = max(roughness, 0.07);
    alpha = alpha * alpha;

    float invAlpha = 1.0 / alpha;

    float sqrCosThetaH = cosThetaH * cosThetaH;
    float sinThetaH = max(1.0 - sqrCosThetaH, 0.001);

    return (2.0 + invAlpha) * pow(sinThetaH, 0.5 * invAlpha) / (2.0 * PI);

}

float velvetParamsInterpolate(int i, float oneMinusAlphaSquared) {

    const float p0[5] = float[5](25.3245, 3.32435, 0.16801, -1.27393, -4.85967);
    const float p1[5] = float[5](21.5473, 3.82987, 0.19823, -1.97760, -4.32054);

    return mix(p1[i], p0[i], oneMinusAlphaSquared);

}

float velvetL(float x, float alpha) {

    float oneMinusAlpha = 1.0 - alpha;
    float oneMinusAlphaSquared = oneMinusAlpha * oneMinusAlpha;

    float a = velvetParamsInterpolate(0, oneMinusAlphaSquared);
    float b = velvetParamsInterpolate(1, oneMinusAlphaSquared);
    float c = velvetParamsInterpolate(2, oneMinusAlphaSquared);
    float d = velvetParamsInterpolate(3, oneMinusAlphaSquared);
    float e = velvetParamsInterpolate(4, oneMinusAlphaSquared);

    return a / (1.0 + b * pow(abs(x), c)) + d * x + e;

}

// See equation (3) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
float velvetLambda(float cosTheta, float alpha) {

    return abs(cosTheta) < 0.5 ? exp(velvetL(cosTheta, alpha)) : exp(2.0 * velvetL(0.5, alpha) - velvetL(1.0 - cosTheta, alpha));

}

// See Section 3, Shadowing Term, in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
float velvetG(float cosThetaO, float cosThetaI, float roughness) {

    float alpha = max(roughness, 0.07);
    alpha = alpha * alpha;

    return 1.0 / (1.0 + velvetLambda(cosThetaO, alpha) + velvetLambda(cosThetaI, alpha));

}

float directionalAlbedoSheen(float cosTheta, float alpha) {

    cosTheta = saturate(cosTheta);

    float c = 1.0 - cosTheta;
    float c3 = c * c * c;

    return 0.65584461 * c3 + 1.0 / (4.16526551 + exp(-7.97291361 * sqrt(alpha) + 6.33516894));

}

float sheenAlbedoScaling(vec3 wo, vec3 wi, SurfaceRec surf) {

    float alpha = max(surf.sheenRoughness, 0.07);
    alpha = alpha * alpha;

    float maxSheenColor = max(max(surf.sheenColor.r, surf.sheenColor.g), surf.sheenColor.b);

    float eWo = directionalAlbedoSheen(saturateCos(wo.z), alpha);
    float eWi = directionalAlbedoSheen(saturateCos(wi.z), alpha);

    return min(1.0 - maxSheenColor * eWo, 1.0 - maxSheenColor * eWi);

}

// See Section 5, Layering, in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
float sheenAlbedoScaling(vec3 wo, SurfaceRec surf) {

    float alpha = max(surf.sheenRoughness, 0.07);
    alpha = alpha * alpha;

    float maxSheenColor = max(max(surf.sheenColor.r, surf.sheenColor.g), surf.sheenColor.b);

    float eWo = directionalAlbedoSheen(saturateCos(wo.z), alpha);

    return 1.0 - maxSheenColor * eWo;

}

`;

const shaderIridescenceFunctions = /* glsl */`

// XYZ to sRGB color space
const mat3 XYZ_TO_REC709 = mat3(
     3.2404542, -0.9692660,  0.0556434,
    -1.5371385,  1.8760108, -0.2040259,
    -0.4985314,  0.0415560,  1.0572252
);

vec3 fresnel0ToIor(vec3 fresnel0) {

    vec3 sqrtF0 = sqrt(fresnel0);
    return (vec3(1.0) + sqrtF0) / (vec3(1.0) - sqrtF0);

}

// Conversion FO/IOR
vec3 iorToFresnel0(vec3 transmittedIor, float incidentIor) {

    return square((transmittedIor - vec3(incidentIor)) / (transmittedIor + vec3(incidentIor)));

}

// ior is a value between 1.0 and 3.0. 1.0 is air interface
float iorToFresnel0(float transmittedIor, float incidentIor) {

    return square((transmittedIor - incidentIor) / (transmittedIor + incidentIor));

}

// Fresnel equations for dielectric/dielectric interfaces. See https://belcour.github.io/blog/research/2017/05/01/brdf-thin-film.html
vec3 evalSensitivity(float OPD, vec3 shift) {

    float phase = 2.0 * PI * OPD * 1.0e-9;

    vec3 val = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);
    vec3 pos = vec3(1.6810e+06, 1.7953e+06, 2.2084e+06);
    vec3 var = vec3(4.3278e+09, 9.3046e+09, 6.6121e+09);

    vec3 xyz = val * sqrt(2.0 * PI * var) * cos(pos * phase + shift) * exp(-square(phase) * var);
    xyz.x += 9.7470e-14 * sqrt(2.0 * PI * 4.5282e+09) * cos(2.2399e+06 * phase + shift[0]) * exp(- 4.5282e+09 * square(phase));
    xyz /= 1.0685e-7;

    vec3 srgb = XYZ_TO_REC709 * xyz;
    return srgb;

}

// See Section 4. Analytic Spectral Integration, A Practical Extension to Microfacet Theory for the Modeling of Varying Iridescence, https://hal.archives-ouvertes.fr/hal-01518344/document
vec3 evalIridescence(float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0) {

    vec3 I;

    // Force iridescenceIor -> outsideIOR when thinFilmThickness -> 0.0
    float iridescenceIor = mix(outsideIOR, eta2, smoothstep(0.0, 0.03, thinFilmThickness));

    // Evaluate the cosTheta on the base layer (Snell law)
    float sinTheta2Sq = square(outsideIOR / iridescenceIor) * (1.0 - square(cosTheta1));

    // Handle TIR:
    float cosTheta2Sq = 1.0 - sinTheta2Sq;
    if (cosTheta2Sq < 0.0) {

        return vec3(1.0);

    }

    float cosTheta2 = sqrt(cosTheta2Sq);

    // First interface
    float R0 = iorToFresnel0(iridescenceIor, outsideIOR);
    float R12 = schlickFresnel(cosTheta1, R0);
    float R21 = R12;
    float T121 = 1.0 - R12;
    float phi12 = 0.0;
    if (iridescenceIor < outsideIOR) {

        phi12 = PI;

    }
    float phi21 = PI - phi12;

    // Second interface
    vec3 baseIOR = fresnel0ToIor(clamp(baseF0, 0.0, 0.9999)); // guard against 1.0
    vec3 R1 = iorToFresnel0(baseIOR, iridescenceIor);
    vec3 R23 = schlickFresnel(cosTheta2, R1);
    vec3 phi23 = vec3(0.0);
    if (baseIOR[0] < iridescenceIor) {

        phi23[0] = PI;

    }
    if (baseIOR[1] < iridescenceIor) {

        phi23[1] = PI;

    }
    if (baseIOR[2] < iridescenceIor) {

        phi23[2] = PI;

    }

    // Phase shift
    float OPD = 2.0 * iridescenceIor * thinFilmThickness * cosTheta2;
    vec3 phi = vec3(phi21) + phi23;

    // Compound terms
    vec3 R123 = clamp(R12 * R23, 1e-5, 0.9999);
    vec3 r123 = sqrt(R123);
    vec3 Rs = square(T121) * R23 / (vec3(1.0) - R123);

    // Reflectance term for m = 0 (DC term amplitude)
    vec3 C0 = R12 + Rs;
    I = C0;

    // Reflectance term for m > 0 (pairs of diracs)
    vec3 Cm = Rs - T121;
    for (int m = 1; m <= 2; ++ m)
    {
        Cm *= r123;
        vec3 Sm = 2.0 * evalSensitivity(float(m) * OPD, float(m) * phi);
        I += Cm * Sm;
    }

    // Since out of gamut colors might be produced, negative color values are clamped to 0.
    return max(I, vec3(0.0));
}

`;

const shaderMaterialSampling = /* glsl */`

struct SurfaceRec {
    vec3 normal;
    vec3 faceNormal;
    bool frontFace;
    float roughness;
    float filteredRoughness;
    float metalness;
    vec3 color;
    vec3 emission;
    float transmission;
    bool thinFilm;
    float ior;
    float iorRatio;
    float clearcoat;
    float clearcoatRoughness;
    float filteredClearcoatRoughness;
    vec3 sheenColor;
    float sheenRoughness;
    float iridescence;
    float iridescenceIor;
    float iridescenceThickness;
    vec3 specularColor;
    float specularIntensity;
    vec3 attenuationColor;
    float attenuationDistance;
};

struct SampleRec {
    float specularPdf;
    float pdf;
    vec3 direction;
    vec3 clearcoatDirection;
    vec3 color;
};

${ shaderGGXFunctions }
${ shaderSheenFunctions }
${ shaderIridescenceFunctions }

// diffuse
float diffusePDF(vec3 wo, vec3 wi, SurfaceRec surf) {

    // https://raytracing.github.io/books/RayTracingTheRestOfYourLife.html#lightscattering/thescatteringpdf
    float cosValue = wi.z;
    return cosValue / PI;

}

vec3 diffuseDirection(vec3 wo, SurfaceRec surf) {

    vec3 lightDirection = randDirection();
    lightDirection.z += 1.0;
    lightDirection = normalize(lightDirection);

    return lightDirection;

}

vec3 diffuseColor(vec3 wo, vec3 wi, SurfaceRec surf) {

    // TODO: scale by 1 - F here
    // note on division by PI
    // https://seblagarde.wordpress.com/2012/01/08/pi-or-not-to-pi-in-game-lighting-equation/
    float metalFactor = (1.0 - surf.metalness);
    return surf.color * metalFactor * wi.z / PI;

}

// specular
float specularPDF(vec3 wo, vec3 wi, SurfaceRec surf) {

    // See 14.1.1 Microfacet BxDFs in https://www.pbr-book.org/
    float filteredRoughness = surf.filteredRoughness;
    vec3 halfVector = getHalfVector(wi, wo);

    float incidentTheta = acos(wo.z);
    float D = ggxDistribution(halfVector, filteredRoughness);
    float G1 = ggxShadowMaskG1(incidentTheta, filteredRoughness);
    float ggxPdf = D * G1 * max(0.0, abs(dot(wo, halfVector))) / abs (wo.z);
    return ggxPdf / (4.0 * dot(wo, halfVector));

}

vec3 specularDirection(vec3 wo, SurfaceRec surf) {

    // sample ggx vndf distribution which gives a new normal
    float filteredRoughness = surf.filteredRoughness;
    vec3 halfVector = ggxDirection(
        wo,
        filteredRoughness,
        filteredRoughness,
        rand(),
        rand()
    );

    // apply to new ray by reflecting off the new normal
    return - reflect(wo, halfVector);

}

vec3 specularColor(vec3 wo, vec3 wi, SurfaceRec surf) {

    // if roughness is set to 0 then D === NaN which results in black pixels
    float metalness = surf.metalness;
    float filteredRoughness = surf.filteredRoughness;

    vec3 halfVector = getHalfVector(wo, wi);
    float iorRatio = surf.iorRatio;
    float G = ggxShadowMaskG2(wi, wo, filteredRoughness);
    float D = ggxDistribution(halfVector, filteredRoughness);

    float f0 = iorRatioToF0(iorRatio);
    vec3 F = vec3(schlickFresnel(dot(wi, halfVector), f0));

    float cosTheta = min(wo.z, 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    bool cannotRefract = iorRatio * sinTheta > 1.0;
    if (cannotRefract) {

        F = vec3(1.0);

    }

    vec3 iridescenceFresnel = evalIridescence(1.0, surf.iridescenceIor, dot(wi, halfVector), surf.iridescenceThickness, vec3(f0));
    vec3 metalF = mix(F, iridescenceFresnel, surf.iridescence);
    vec3 dialectricF = F * surf.specularIntensity;
    F = mix(dialectricF, metalF, metalness);

    vec3 color = mix(surf.specularColor, surf.color, metalness);
    color = mix(color, vec3(1.0), F);
    color *= G * D / (4.0 * abs(wi.z * wo.z));
    color *= mix(F, vec3(1.0), metalness);
    color *= wi.z; // scale the light by the direction the light is coming in from

    return color;

}

/*
// transmission
function transmissionPDF(wo, wi, material, surf) {

    // See section 4.2 in https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf

    const { roughness, ior } = material;
    const { frontFace } = hit;
    const ratio = frontFace ? ior : 1 / ior;
    const minRoughness = Math.max(roughness, MIN_ROUGHNESS);

    halfVector.set(0, 0, 0).addScaledVector(wi, ratio).addScaledVector(wo, 1.0).normalize().multiplyScalar(- 1);

    const denom = Math.pow(ratio * halfVector.dot(wi) + 1.0 * halfVector.dot(wo), 2.0);
    return ggxPDF(wo, halfVector, minRoughness) / denom;

}

function transmissionDirection(wo, hit, material, lightDirection) {

    const { roughness, ior } = material;
    const { frontFace } = hit;
    const ratio = frontFace ? 1 / ior : ior;
    const minRoughness = Math.max(roughness, MIN_ROUGHNESS);

    // sample ggx vndf distribution which gives a new normal
    ggxDirection(
        wo,
        minRoughness,
        minRoughness,
        Math.random(),
        Math.random(),
        halfVector,
    );

    // apply to new ray by reflecting off the new normal
    tempDir.copy(wo).multiplyScalar(- 1);
    refract(tempDir, halfVector, ratio, lightDirection);

}

function transmissionColor(wo, wi, material, hit, colorTarget) {

    const { metalness, transmission } = material;
    colorTarget
        .copy(material.color)
        .multiplyScalar((1.0 - metalness) * wo.z)
        .multiplyScalar(transmission);

}
*/

// TODO: This is just using a basic cosine-weighted specular distribution with an
// incorrect PDF value at the moment. Update it to correctly use a GGX distribution
float transmissionPDF(vec3 wo, vec3 wi, SurfaceRec surf) {

    float iorRatio = surf.iorRatio;
    float cosTheta = min(wo.z, 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    float reflectance = schlickFresnelFromIor(cosTheta, iorRatio);
    bool cannotRefract = iorRatio * sinTheta > 1.0;
    if (cannotRefract) {

        return 0.0;

    }

    return 1.0 / (1.0 - reflectance);

}

vec3 transmissionDirection(vec3 wo, SurfaceRec surf) {

    float roughness = surf.roughness;
    float iorRatio = surf.iorRatio;

    vec3 halfVector = normalize(vec3(0.0, 0.0, 1.0) + randDirection() * roughness);
    vec3 lightDirection = refract(normalize(- wo), halfVector, iorRatio);

    if (surf.thinFilm) {

        lightDirection = -refract(normalize(-lightDirection), - vec3(0.0, 0.0, 1.0), 1.0 / iorRatio);

    }
    return normalize(lightDirection);

}

vec3 transmissionColor(vec3 wo, vec3 wi, SurfaceRec surf) {

    // only attenuate the color if it's on the way in
    vec3 col = surf.thinFilm || surf.frontFace ? surf.color : vec3(1.0);
    return surf.transmission * col;

}

// clearcoat
float clearcoatPDF(vec3 wo, vec3 wi, SurfaceRec surf) {

    // See equation (27) in http://jcgt.org/published/0003/02/03/
    float filteredClearcoatRoughness = surf.filteredClearcoatRoughness;
    vec3 halfVector = getHalfVector(wi, wo);
    return ggxPDF(wo, halfVector, filteredClearcoatRoughness) / (4.0 * dot(wi, halfVector));

}

vec3 clearcoatDirection(vec3 wo, SurfaceRec surf) {

    // sample ggx vndf distribution which gives a new normal
    float filteredClearcoatRoughness = surf.filteredClearcoatRoughness;
    vec3 halfVector = ggxDirection(
        wo,
        filteredClearcoatRoughness,
        filteredClearcoatRoughness,
        rand(),
        rand()
    );

    // apply to new ray by reflecting off the new normal
    return - reflect(wo, halfVector);

}

void clearcoatColor(inout vec3 color, vec3 wo, vec3 wi, SurfaceRec surf) {

    float ior = 1.5;
    bool frontFace = surf.frontFace;
    float filteredClearcoatRoughness = surf.filteredClearcoatRoughness;

    vec3 halfVector = getHalfVector(wo, wi);
    float iorRatio = frontFace ? 1.0 / ior : ior;
    float G = ggxShadowMaskG2(wi, wo, filteredClearcoatRoughness);
    float D = ggxDistribution(halfVector, filteredClearcoatRoughness);

    float F = schlickFresnelFromIor(dot(wi, halfVector), ior);
    float cosTheta = min(wo.z, 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    bool cannotRefract = iorRatio * sinTheta > 1.0;
    if (cannotRefract) {

        F = 1.0;

    }

    float fClearcoat = F * D * G / (4.0 * abs(wi.z * wo.z));

    color = color * (1.0 - surf.clearcoat * F) + fClearcoat * surf.clearcoat * wi.z;

}

// sheen
vec3 sheenColor(vec3 wo, vec3 wi, SurfaceRec surf) {

    vec3 halfVector = getHalfVector(wo, wi);

    float cosThetaO = saturateCos(wo.z);
    float cosThetaI = saturateCos(wi.z);
    float cosThetaH = halfVector.z;

    float D = velvetD(cosThetaH, surf.sheenRoughness);
    float G = velvetG(cosThetaO, cosThetaI, surf.sheenRoughness);

    // See equation (1) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
    vec3 color = surf.sheenColor;
    color *= D * G / (4.0 * abs(cosThetaO * cosThetaI));
    color *= wi.z;

    return color;

}

// bsdf
void getLobeWeights(vec3 wo, vec3 clearcoatWo, SurfaceRec surf, out float diffuseWeight, out float specularWeight, out float transmissionWeight, out float clearcoatWeight) {

    float metalness = surf.metalness;
    float transmission = surf.transmission;

    // TODO: we should compute a half vector ahead of time and pass it into the sampling functions
    // so all functions will use the same half vector
    float iorRatio = surf.iorRatio;
    float cosTheta = min(wo.z, 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    float reflectance = schlickFresnelFromIor(cosTheta, iorRatio);
    bool cannotRefract = iorRatio * sinTheta > 1.0;
    if (cannotRefract) {

        reflectance = 1.0;

    }

    float transSpecularProb = mix(reflectance, 1.0, metalness);
    float diffSpecularProb = 0.5 + 0.5 * metalness;

    clearcoatWeight = surf.clearcoat * schlickFresnel(clearcoatWo.z, 0.04);
    diffuseWeight = (1.0 - transmission) * (1.0 - diffSpecularProb) * (1.0 - clearcoatWeight);
    specularWeight = transmission * transSpecularProb + (1.0 - transmission) * diffSpecularProb * (1.0 - clearcoatWeight);
    transmissionWeight = transmission * (1.0 - transSpecularProb) * (1.0 - clearcoatWeight);

    float totalWeight = diffuseWeight + specularWeight + transmissionWeight + clearcoatWeight;
    diffuseWeight /= totalWeight;
    specularWeight /= totalWeight;
    transmissionWeight /= totalWeight;
    clearcoatWeight /= totalWeight;

}

float bsdfPdf(vec3 wo, vec3 clearcoatWo, vec3 wi, vec3 clearcoatWi, SurfaceRec surf, out float specularPdf, float diffuseWeight, float specularWeight, float transmissionWeight, float clearcoatWeight) {

    float metalness = surf.metalness;
    float transmission = surf.transmission;

    float iorRatio = surf.iorRatio;
    float cosTheta = min(wo.z, 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    float reflectance = schlickFresnelFromIor(cosTheta, iorRatio);
    bool cannotRefract = iorRatio * sinTheta > 1.0;
    if (cannotRefract) {

        reflectance = 1.0;

    }

    float spdf = 0.0;
    float dpdf = 0.0;
    float tpdf = 0.0;
    float cpdf = 0.0;

    if (wi.z < 0.0) {

        if(transmissionWeight > 0.0) {

            tpdf = transmissionPDF(wo, wi, surf);

        }

    } else {

        if(diffuseWeight > 0.0) {

            dpdf = diffusePDF(wo, wi, surf);

        }

        if(specularWeight > 0.0) {

            spdf = specularPDF(wo, wi, surf);

        }

    }

    if(clearcoatWi.z >= 0.0 && clearcoatWeight > 0.0) {

        cpdf = clearcoatPDF(clearcoatWo, clearcoatWi, surf);

    }

    float pdf =
          dpdf * diffuseWeight
        + spdf * specularWeight
        + tpdf * transmissionWeight
        + cpdf * clearcoatWeight;

    // retrieve specular rays for the shadows flag
    specularPdf = spdf * specularWeight + cpdf * clearcoatWeight;

    return pdf;

}

vec3 bsdfColor(vec3 wo, vec3 clearcoatWo, vec3 wi, vec3 clearcoatWi, SurfaceRec surf, float diffuseWeight, float specularWeight, float transmissionWeight, float clearcoatWeight) {

    vec3 color = vec3(0.0);
    if (wi.z < 0.0) {

        if(transmissionWeight > 0.0) {

            color = transmissionColor(wo, wi, surf);

        }

    } else {

        if(diffuseWeight > 0.0) {

            color = diffuseColor(wo, wi, surf);
            color *= 1.0 - surf.transmission;

        }

        if(specularWeight > 0.0) {

            color += specularColor(wo, wi, surf);

        }

        color *= sheenAlbedoScaling(wo, wi, surf);
        color += sheenColor(wo, wi, surf);

    }

    if(clearcoatWi.z >= 0.0 && clearcoatWeight > 0.0) {

        clearcoatColor(color, clearcoatWo, clearcoatWi, surf);

    }

    return color;

}

float bsdfResult(vec3 wo, vec3 clearcoatWo, vec3 wi, vec3 clearcoatWi, SurfaceRec surf, out vec3 color) {

    float diffuseWeight;
    float specularWeight;
    float transmissionWeight;
    float clearcoatWeight;
    getLobeWeights(wo, clearcoatWo, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight);

    float specularPdf;
    color = bsdfColor(wo, clearcoatWo, wi, clearcoatWi, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight);
    return bsdfPdf(wo, clearcoatWo, wi, clearcoatWi, surf, specularPdf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight);

}

SampleRec bsdfSample(vec3 wo, vec3 clearcoatWo, mat3 normalBasis, mat3 invBasis, mat3 clearcoatNormalBasis, mat3 clearcoatInvBasis, SurfaceRec surf) {

    float diffuseWeight;
    float specularWeight;
    float transmissionWeight;
    float clearcoatWeight;
    getLobeWeights(wo, clearcoatWo, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight);

    float pdf[4];
    pdf[0] = diffuseWeight;
    pdf[1] = specularWeight;
    pdf[2] = transmissionWeight;
    pdf[3] = clearcoatWeight;

    float cdf[4];
    cdf[0] = pdf[0];
    cdf[1] = pdf[1] + cdf[0];
    cdf[2] = pdf[2] + cdf[1];
    cdf[3] = pdf[3] + cdf[2];

    if(cdf[3] != 0.0) {

        float invMaxCdf = 1.0 / cdf[3];
        cdf[0] *= invMaxCdf;
        cdf[1] *= invMaxCdf;
        cdf[2] *= invMaxCdf;
        cdf[3] *= invMaxCdf;

    } else {

        cdf[0] = 1.0;
        cdf[1] = 0.0;
        cdf[2] = 0.0;
        cdf[3] = 0.0;

    }

    vec3 wi;
    vec3 clearcoatWi;

    float r = rand();
    if (r <= cdf[0]) { // diffuse

        wi = diffuseDirection(wo, surf);
        clearcoatWi = normalize(clearcoatInvBasis * normalize(normalBasis * wi));

    } else if (r <= cdf[1]) { // specular

        wi = specularDirection(wo, surf);
        clearcoatWi = normalize(clearcoatInvBasis * normalize(normalBasis * wi));

    } else if (r <= cdf[2]) { // transmission / refraction

        wi = transmissionDirection(wo, surf);
        clearcoatWi = normalize(clearcoatInvBasis * normalize(normalBasis * wi));

    } else if (r <= cdf[3]) { // clearcoat

        clearcoatWi = clearcoatDirection(clearcoatWo, surf);
        wi = normalize(invBasis * normalize(clearcoatNormalBasis * clearcoatWi));

    }

    SampleRec result;
    result.pdf = bsdfPdf(wo, clearcoatWo, wi, clearcoatWi, surf, result.specularPdf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight);
    result.color = bsdfColor(wo, clearcoatWo, wi, clearcoatWi, surf, diffuseWeight, specularWeight, transmissionWeight, clearcoatWeight);
    result.direction = wi;
    result.clearcoatDirection = clearcoatWi;

    return result;

}
`;

const shaderEnvMapSampling = /* glsl */`

vec3 sampleEquirectEnvMapColor(vec3 direction, sampler2D map) {

    return texture2D(map, equirectDirectionToUv(direction)).rgb;

}

float envMapDirectionPdf(vec3 direction) {

    vec2 uv = equirectDirectionToUv(direction);
    float theta = uv.y * PI;
    float sinTheta = sin(theta);
    if (sinTheta == 0.0) {

        return 0.0;

    }

    return 1.0 / (2.0 * PI * PI * sinTheta);

}

float envMapSample(vec3 direction, EquirectHdrInfo info, out vec3 color) {

    vec2 uv = equirectDirectionToUv(direction);
    color = texture2D(info.map, uv).rgb;

    float totalSum = info.totalSumWhole + info.totalSumDecimal;
    float lum = colorToLuminance(color);
    ivec2 resolution = textureSize(info.map, 0);
    float pdf = lum / totalSum;

    return float(resolution.x * resolution.y) * pdf * envMapDirectionPdf(direction);

}

float randomEnvMapSample(EquirectHdrInfo info, out vec3 color, out vec3 direction) {

    // sample env map cdf
    vec2 r = rand2();
    float v = texture2D(info.marginalWeights, vec2(r.x, 0.0)).x;
    float u = texture2D(info.conditionalWeights, vec2(r.y, v)).x;
    vec2 uv = vec2(u, v);

    vec3 derivedDirection = equirectUvToDirection(uv);
    direction = derivedDirection;
    color = texture2D(info.map, uv).rgb;

    float totalSum = info.totalSumWhole + info.totalSumDecimal;
    float lum = colorToLuminance(color);
    ivec2 resolution = textureSize(info.map, 0);
    float pdf = lum / totalSum;

    return float(resolution.x * resolution.y) * pdf * envMapDirectionPdf(direction);

}

`;

const shaderLightSampling = /* glsl */`

float getSpotAttenuation(const in float coneCosine, const in float penumbraCosine, const in float angleCosine) {

    return smoothstep(coneCosine, penumbraCosine, angleCosine);

}

float getDistanceAttenuation(const in float lightDistance, const in float cutoffDistance, const in float decayExponent) {

    // based upon Frostbite 3 Moving to Physically-based Rendering
    // page 32, equation 26: E[window1]
    // https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
    float distanceFalloff = 1.0 / max(pow(lightDistance, decayExponent), EPSILON);

    if (cutoffDistance > 0.0) {

        distanceFalloff *= pow2(saturate(1.0 - pow4(lightDistance / cutoffDistance)));

    }

    return distanceFalloff;

}

float getPhotometricAttenuation(sampler2DArray iesProfiles, int iesProfile, vec3 posToLight, vec3 lightDir, vec3 u, vec3 v) {

    float cosTheta = dot(posToLight, lightDir);
    float angle = acos(cosTheta) * (1.0 / PI);

    return texture2D(iesProfiles, vec3(0.0, angle, iesProfile)).r;

}

struct LightSampleRec {

    bool hit;
    float dist;
    vec3 direction;
    float pdf;
    vec3 emission;
    int type;

};

LightSampleRec lightsClosestHit(sampler2D lights, uint lightCount, vec3 rayOrigin, vec3 rayDirection) {

    LightSampleRec lightSampleRec;
    lightSampleRec.hit = false;

    uint l;
    for (l = 0u; l < lightCount; l ++) {

        Light light = readLightInfo(lights, l);

        vec3 u = light.u;
        vec3 v = light.v;

        // check for backface
        vec3 normal = normalize(cross(u, v));
        if (dot(normal, rayDirection) < 0.0) {
            continue;
        }

        u *= 1.0 / dot(u, u);
        v *= 1.0 / dot(v, v);

        float dist;

        if(
            (light.type == RECT_AREA_LIGHT_TYPE && intersectsRectangle(light.position, normal, u, v, rayOrigin, rayDirection, dist)) ||
            (light.type == CIRC_AREA_LIGHT_TYPE && intersectsCircle(light.position, normal, u, v, rayOrigin, rayDirection, dist))
        ) {

            if (dist < lightSampleRec.dist || ! lightSampleRec.hit) {

                float cosTheta = dot(rayDirection, normal);

                lightSampleRec.hit = true;
                lightSampleRec.dist = dist;
                lightSampleRec.pdf = (dist * dist) / (light.area * cosTheta);
                lightSampleRec.emission = light.color * light.intensity;
                lightSampleRec.direction = rayDirection;
                lightSampleRec.type = light.type;

            }

        } else if (light.type == SPOT_LIGHT_TYPE) {

            // TODO: forward path tracing sampling needs to be made consistent with direct light sampling logic
            // float radius = light.radius;
            // vec3 lightNormal = normalize(cross(light.u, light.v));
            // float angle = acos(light.coneCos);
            // float angleTan = tan(angle);
            // float startDistance = radius / max(angleTan, EPSILON);

            // u = light.u / radius;
            // v = light.v / radius;

            // if (
            //     intersectsCircle(light.position - normal * startDistance, normal, u, v, rayOrigin, rayDirection, dist) &&
            //     (dist < lightSampleRec.dist || ! lightSampleRec.hit)
            //) {

            //     float cosTheta = dot(rayDirection, normal);
            //     float spotAttenuation = light.iesProfile != -1 ?
            //         getPhotometricAttenuation(iesProfiles, light.iesProfile, rayDirection, normal, u, v)
            //         : getSpotAttenuation(light.coneCos, light.penumbraCos, cosTheta);

            //     float distanceAttenuation = getDistanceAttenuation(dist, light.distance, light.decay);

            //     lightSampleRec.hit = true;
            //     lightSampleRec.dist = dist;
            //     lightSampleRec.direction = rayDirection;
            //     lightSampleRec.emission = light.color * light.intensity * distanceAttenuation * spotAttenuation;
            //     lightSampleRec.pdf = (dist * dist) / (light.area * cosTheta);

            // }

        }

    }

    return lightSampleRec;

}

LightSampleRec randomAreaLightSample(Light light, vec3 rayOrigin) {

    LightSampleRec lightSampleRec;
    lightSampleRec.hit = true;
    lightSampleRec.type = light.type;

    lightSampleRec.emission = light.color * light.intensity;

    vec3 randomPos;
    if(light.type == RECT_AREA_LIGHT_TYPE) {

        // rectangular area light
        randomPos = light.position + light.u * (rand() -0.5) + light.v * (rand() -0.5);

    } else if(light.type == 1) {

        // circular area light
        float r = 0.5 * sqrt(rand());
        float theta = rand() * 2.0 * PI;
        float x = r * cos(theta);
        float y = r * sin(theta);

        randomPos = light.position + light.u * x + light.v * y;

    }

    vec3 toLight = randomPos - rayOrigin;
    float lightDistSq = dot(toLight, toLight);
    lightSampleRec.dist = sqrt(lightDistSq);

    vec3 direction = toLight / lightSampleRec.dist;
    lightSampleRec.direction = direction;

    vec3 lightNormal = normalize(cross(light.u, light.v));
    lightSampleRec.pdf = lightDistSq / (light.area * dot(direction, lightNormal));

    return lightSampleRec;

}

LightSampleRec randomSpotLightSample(Light light, sampler2DArray iesProfiles, vec3 rayOrigin) {

    float radius = light.radius * sqrt(rand());
    float theta = rand() * 2.0 * PI;
    float x = radius * cos(theta);
    float y = radius * sin(theta);

    vec3 u = light.u;
    vec3 v = light.v;
    vec3 normal = normalize(cross(u, v));

    float angle = acos(light.coneCos);
    float angleTan = tan(angle);
    float startDistance = light.radius / max(angleTan, EPSILON);

    vec3 randomPos = light.position - normal * startDistance + u * x + v * y;
    vec3 toLight = randomPos - rayOrigin;
    float lightDistSq = dot(toLight, toLight);
    float dist = sqrt(lightDistSq);

    vec3 direction = toLight / max(dist, EPSILON);
    float cosTheta = dot(direction, normal);

    float spotAttenuation = light.iesProfile != -1 ?
          getPhotometricAttenuation(iesProfiles, light.iesProfile, direction, normal, u, v)
        : getSpotAttenuation(light.coneCos, light.penumbraCos, cosTheta);

    float distanceAttenuation = getDistanceAttenuation(dist, light.distance, light.decay);
    LightSampleRec lightSampleRec;
    lightSampleRec.hit = true;
    lightSampleRec.type = light.type;
    lightSampleRec.dist = dist;
    lightSampleRec.direction = direction;
    lightSampleRec.emission = light.color * light.intensity * distanceAttenuation * spotAttenuation;

    // TODO: this makes the result consistent between MIS and non MIS paths but at radius 0 the pdf is infinite
    // and the intensity of the light is not correct
    lightSampleRec.pdf = 1.0;
    // lightSampleRec.pdf = lightDistSq / (light.area * cosTheta);

    return lightSampleRec;

}

LightSampleRec randomLightSample(sampler2D lights, sampler2DArray iesProfiles, uint lightCount, vec3 rayOrigin) {

    // pick a random light
    uint l = uint(rand() * float(lightCount));
    Light light = readLightInfo(lights, l);

    if (light.type == SPOT_LIGHT_TYPE) {

        return randomSpotLightSample(light, iesProfiles, rayOrigin);

    } else {

        // sample the light
        return randomAreaLightSample(light, rayOrigin);

    }

}

`;

class PhysicalPathTracingMaterial extends MaterialBase {

    onBeforeRender() {

        this.setDefine('FEATURE_DOF', this.physicalCamera.bokehSize === 0 ? 0 : 1);

    }

    constructor(parameters) {

        super({

            transparent: true,
            depthWrite: false,

            defines: {
                FEATURE_MIS: 1,
                FEATURE_DOF: 1,
                FEATURE_GRADIENT_BG: 0,
                TRANSPARENT_TRAVERSALS: 5,
                // 0 = Perspective
                // 1 = Orthographic
                // 2 = Equirectangular
                CAMERA_TYPE: 0,
            },

            uniforms: {
                resolution: { value: new Vector2() },

                bounces: { value: 3 },
                physicalCamera: { value: new PhysicalCameraUniform() },

                bvh: { value: new MeshBVHUniformStruct() },
                normalAttribute: { value: new FloatVertexAttributeTexture() },
                tangentAttribute: { value: new FloatVertexAttributeTexture() },
                uvAttribute: { value: new FloatVertexAttributeTexture() },
                colorAttribute: { value: new FloatVertexAttributeTexture() },
                materialIndexAttribute: { value: new UIntVertexAttributeTexture() },
                materials: { value: new MaterialsTexture() },
                textures: { value: new RenderTarget2DArray().texture },
                lights: { value: new LightsInfoUniformStruct() },
                iesProfiles: { value: new IESProfilesTexture().texture },
                cameraWorldMatrix: { value: new Matrix4() },
                invProjectionMatrix: { value: new Matrix4() },
                backgroundBlur: { value: 0.0 },
                environmentIntensity: { value: 1.0 },
                environmentRotation: { value: new Matrix3() },
                envMapInfo: { value: new EquirectHdrInfoUniform() },

                seed: { value: 0 },
                opacity: { value: 1 },
                filterGlossyFactor: { value: 0.0 },

                bgGradientTop: { value: new Color(0x111111) },
                bgGradientBottom: { value: new Color(0x000000) },
                backgroundAlpha: { value: 1.0 },
            },

            vertexShader: /* glsl */`

                varying vec2 vUv;
                void main() {

                    vec4 mvPosition = vec4(position, 1.0);
                    mvPosition = modelViewMatrix * mvPosition;
                    gl_Position = projectionMatrix * mvPosition;

                    vUv = uv;

                }

            `,

            fragmentShader: /* glsl */`
                #define RAY_OFFSET 1e-4

                precision highp isampler2D;
                precision highp usampler2D;
                precision highp sampler2DArray;
                vec4 envMapTexelToLinear(vec4 a) { return a; }
                #include <common>

                ${ shaderStructs }
                ${ shaderIntersectFunction }
                ${ shaderMaterialStructs }
                ${ shaderLightStruct }

                ${ shaderUtils }
                ${ shaderMaterialSampling }
                ${ shaderEnvMapSampling }

                uniform mat3 environmentRotation;
                uniform float backgroundBlur;
                uniform float backgroundAlpha;

                #if FEATURE_GRADIENT_BG

                uniform vec3 bgGradientTop;
                uniform vec3 bgGradientBottom;

                #endif

                #if FEATURE_DOF

                uniform PhysicalCamera physicalCamera;

                #endif

                uniform vec2 resolution;
                uniform int bounces;
                uniform mat4 cameraWorldMatrix;
                uniform mat4 invProjectionMatrix;
                uniform sampler2D normalAttribute;
                uniform sampler2D tangentAttribute;
                uniform sampler2D uvAttribute;
                uniform sampler2D colorAttribute;
                uniform usampler2D materialIndexAttribute;
                uniform BVH bvh;
                uniform float environmentIntensity;
                uniform float filterGlossyFactor;
                uniform int seed;
                uniform float opacity;
                uniform sampler2D materials;
                uniform LightsInfo lights;
                uniform sampler2DArray iesProfiles;

                ${ shaderLightSampling }

                uniform EquirectHdrInfo envMapInfo;

                uniform sampler2DArray textures;
                varying vec2 vUv;

                float applyFilteredGlossy(float roughness, float accumulatedRoughness) {

                    return clamp(
                        max(
                            roughness,
                            accumulatedRoughness * filterGlossyFactor * 5.0),
                        0.0,
                        1.0
                    );

                }

                vec3 sampleBackground(vec3 direction) {

                    #if FEATURE_GRADIENT_BG

                    direction = normalize(direction + randDirection() * 0.05);

                    float value = (direction.y + 1.0) / 2.0;
                    value = pow(value, 2.0);

                    return mix(bgGradientBottom, bgGradientTop, value);

                    #else

                    vec3 sampleDir = normalize(direction + getHemisphereSample(direction, rand2()) * 0.5 * backgroundBlur);
                    return environmentIntensity * sampleEquirectEnvMapColor(sampleDir, envMapInfo.map);

                    #endif

                }

                // step through multiple surface hits and accumulate color attenuation based on transmissive surfaces
                bool attenuateHit(BVH bvh, vec3 rayOrigin, vec3 rayDirection, int traversals, bool isShadowRay, out vec3 color) {

                    // hit results
                    uvec4 faceIndices = uvec4(0u);
                    vec3 faceNormal = vec3(0.0, 0.0, 1.0);
                    vec3 barycoord = vec3(0.0);
                    float side = 1.0;
                    float dist = 0.0;

                    color = vec3(1.0);

                    for (int i = 0; i < traversals; i++) {

                        if (bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist)) {

                            // TODO: attenuate the contribution based on the PDF of the resulting ray including refraction values
                            // Should be able to work using the material BSDF functions which will take into account specularity, etc.
                            // TODO: should we account for emissive surfaces here?

                            vec2 uv = textureSampleBarycoord(uvAttribute, barycoord, faceIndices.xyz).xy;
                            vec4 vertexColor = textureSampleBarycoord(colorAttribute, barycoord, faceIndices.xyz);
                            uint materialIndex = uTexelFetch1D(materialIndexAttribute, faceIndices.x).r;
                            Material material = readMaterialInfo(materials, materialIndex);

                            // adjust the ray to the new surface
                            bool isBelowSurface = dot(rayDirection, faceNormal) < 0.0;
                            vec3 point = rayOrigin + rayDirection * dist;
                            vec3 absPoint = abs(point);
                            float maxPoint = max(absPoint.x, max(absPoint.y, absPoint.z));
                            rayOrigin = point + faceNormal * (maxPoint + 1.0) * (isBelowSurface ? - RAY_OFFSET : RAY_OFFSET);

                            if (!material.castShadow && isShadowRay) {

                                continue;

                            }

                            // Opacity Test

                            // albedo
                            vec4 albedo = vec4(material.color, material.opacity);
                            if (material.map != -1) {

                                vec3 uvPrime = material.mapTransform * vec3(uv, 1);
                                albedo *= texture2D(textures, vec3(uvPrime.xy, material.map));

                            }

                            if (material.vertexColors) {

                                albedo *= vertexColor;

                            }

                            // alphaMap
                            if (material.alphaMap != -1) {

                                albedo.a *= texture2D(textures, vec3(uv, material.alphaMap)).x;

                            }

                            // transmission
                            float transmission = material.transmission;
                            if (material.transmissionMap != -1) {

                                vec3 uvPrime = material.transmissionMapTransform * vec3(uv, 1);
                                transmission *= texture2D(textures, vec3(uvPrime.xy, material.transmissionMap)).r;

                            }

                            // metalness
                            float metalness = material.metalness;
                            if (material.metalnessMap != -1) {

                                vec3 uvPrime = material.metalnessMapTransform * vec3(uv, 1);
                                metalness *= texture2D(textures, vec3(uvPrime.xy, material.metalnessMap)).b;

                            }

                            float alphaTest = material.alphaTest;
                            bool useAlphaTest = alphaTest != 0.0;
                            float transmissionFactor = (1.0 - metalness) * transmission;
                            if (
                                transmissionFactor < rand() && ! (
                                    // material sidedness
                                    material.side != 0.0 && side == material.side

                                    // alpha test
                                    || useAlphaTest && albedo.a < alphaTest

                                    // opacity
                                    || material.transparent && ! useAlphaTest && albedo.a < rand()
                                )
                            ) {

                                return true;

                            }

                            if (side == 1.0 && isBelowSurface) {

                                // only attenuate by surface color on the way in
                                color *= mix(vec3(1.0), albedo.rgb, transmissionFactor);

                            } else if (side == -1.0) {

                                // attenuate by medium once we hit the opposite side of the model
                                color *= transmissionAttenuation(dist, material.attenuationColor, material.attenuationDistance);

                            }

                        } else {

                            return false;

                        }

                    }

                    return true;

                }

                // returns whether the ray hit anything before a certain distance, not just the first surface. Could be optimized to not check the full hierarchy.
                bool anyCloserHit(BVH bvh, vec3 rayOrigin, vec3 rayDirection, float maxDist) {

                    uvec4 faceIndices = uvec4(0u);
                    vec3 faceNormal = vec3(0.0, 0.0, 1.0);
                    vec3 barycoord = vec3(0.0);
                    float side = 1.0;
                    float dist = 0.0;
                    bool hit = bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
                    return hit && dist < maxDist;

                }

                // tentFilter from Peter Shirley's 'Realistic Ray Tracing (2nd Edition)' book, pg. 60
                // erichlof/v3d.js-PathTracing-Renderer/
                float tentFilter(float x) {

                    return x < 0.5 ? sqrt(2.0 * x) -1.0 : 1.0 - sqrt(2.0 - (2.0 * x));

                }

                vec3 ndcToRayOrigin(vec2 coord) {

                    vec4 rayOrigin4 = cameraWorldMatrix * invProjectionMatrix * vec4(coord, -1.0, 1.0);
                    return rayOrigin4.xyz / rayOrigin4.w;
                }

                void getCameraRay(out vec3 rayDirection, out vec3 rayOrigin) {

                    vec2 ssd = vec2(1.0) / resolution;

                    // Jitter the camera ray by finding a uv coordinate at a random sample
                    // around this pixel's UV coordinate
                    vec2 jitteredUv = vUv + vec2(tentFilter(rand()) * ssd.x, tentFilter(rand()) * ssd.y);

                    #if CAMERA_TYPE == 2

                        // Equirectangular projection

                        vec4 rayDirection4 = vec4(equirectUvToDirection(jitteredUv), 0.0);
                        vec4 rayOrigin4 = vec4(0.0, 0.0, 0.0, 1.0);

                        rayDirection4 = cameraWorldMatrix * rayDirection4;
                        rayOrigin4 = cameraWorldMatrix * rayOrigin4;

                        rayDirection = normalize(rayDirection4.xyz);
                        rayOrigin = rayOrigin4.xyz / rayOrigin4.w;

                    #else

                        // get [- 1, 1] normalized device coordinates
                        vec2 ndc = 2.0 * jitteredUv - vec2(1.0);

                        rayOrigin = ndcToRayOrigin(ndc);

                        #if CAMERA_TYPE == 1

                            // Orthographic projection

                            rayDirection = (cameraWorldMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz;
                            rayDirection = normalize(rayDirection);

                        #else

                            // Perspective projection

                            rayDirection = normalize(mat3(cameraWorldMatrix) * (invProjectionMatrix * vec4(ndc, 0.0, 1.0)).xyz);

                        #endif

                    #endif

                    #if FEATURE_DOF
                    {

                        // depth of field
                        vec3 focalPoint = rayOrigin + normalize(rayDirection) * physicalCamera.focusDistance;

                        // get the aperture sample
                        vec2 apertureSample = sampleAperture(physicalCamera.apertureBlades) * physicalCamera.bokehSize * 0.5 * 1e-3;

                        // rotate the aperture shape
                        float ac = cos(physicalCamera.apertureRotation);
                        float as = sin(physicalCamera.apertureRotation);
                        apertureSample = vec2(
                            apertureSample.x * ac - apertureSample.y * as,
                            apertureSample.x * as + apertureSample.y * ac
                        );
                        apertureSample.x *= saturate(physicalCamera.anamorphicRatio);
                        apertureSample.y *= saturate(1.0 / physicalCamera.anamorphicRatio);

                        // create the new ray
                        rayOrigin += (cameraWorldMatrix * vec4(apertureSample, 0.0, 0.0)).xyz;
                        rayDirection = focalPoint - rayOrigin;

                    }
                    #endif

                    rayDirection = normalize(rayDirection);

                }

                void main() {

                    rng_initialize(gl_FragCoord.xy, seed);

                    vec3 rayDirection;
                    vec3 rayOrigin;

                    getCameraRay(rayDirection, rayOrigin);

                    // inverse environment rotation
                    mat3 invEnvironmentRotation = inverse(environmentRotation);

                    // final color
                    gl_FragColor = vec4(0.0);
                    gl_FragColor.a = 1.0;

                    // hit results
                    uvec4 faceIndices = uvec4(0u);
                    vec3 faceNormal = vec3(0.0, 0.0, 1.0);
                    vec3 barycoord = vec3(0.0);
                    float side = 1.0;
                    float dist = 0.0;

                    // path tracing state
                    float accumulatedRoughness = 0.0;
                    float accumulatedClearcoatRoughness = 0.0;
                    bool transmissiveRay = true;
                    int transparentTraversals = TRANSPARENT_TRAVERSALS;
                    vec3 throughputColor = vec3(1.0);
                    SampleRec sampleRec;
                    int i;
                    bool isShadowRay = false;

                    for (i = 0; i < bounces; i++) {

                        bool hit = bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);

                        LightSampleRec lightHit = lightsClosestHit(lights.tex, lights.count, rayOrigin, rayDirection);

                        if (lightHit.hit && (lightHit.dist < dist || !hit)) {

                            if (i == 0 || transmissiveRay) {

                                gl_FragColor.rgb += lightHit.emission * throughputColor;

                            } else {

                                #if FEATURE_MIS

                                // NOTE: we skip MIS for spotlights since we haven't fixed the forward
                                // path tracing code path, yet
                                if (lightHit.type == SPOT_LIGHT_TYPE) {

                                    gl_FragColor.rgb += lightHit.emission * throughputColor;

                                } else {

                                    // weight the contribution
                                    float misWeight = misHeuristic(sampleRec.pdf, lightHit.pdf / float(lights.count + 1u));
                                    gl_FragColor.rgb += lightHit.emission * throughputColor * misWeight;

                                }

                                #else

                                gl_FragColor.rgb += lightHit.emission * throughputColor;

                                #endif

                            }
                            break;

                        }

                        if (!hit) {

                            if (i == 0 || transmissiveRay) {

                                gl_FragColor.rgb += sampleBackground(environmentRotation * rayDirection) * throughputColor;
                                gl_FragColor.a = backgroundAlpha;

                            } else {

                                #if FEATURE_MIS

                                // get the PDF of the hit envmap point
                                vec3 envColor;
                                float envPdf = envMapSample(environmentRotation * rayDirection, envMapInfo, envColor);
                                envPdf /= float(lights.count + 1u);

                                // and weight the contribution
                                float misWeight = misHeuristic(sampleRec.pdf, envPdf);
                                gl_FragColor.rgb += environmentIntensity * envColor * throughputColor * misWeight;

                                #else

                                gl_FragColor.rgb +=
                                    environmentIntensity *
                                    sampleEquirectEnvMapColor(environmentRotation * rayDirection, envMapInfo.map) *
                                    throughputColor;

                                #endif

                            }
                            break;

                        }

                        uint materialIndex = uTexelFetch1D(materialIndexAttribute, faceIndices.x).r;
                        Material material = readMaterialInfo(materials, materialIndex);

                        if (material.matte && i == 0) {

                            gl_FragColor = vec4(0.0);
                            break;

                        }

                        // if we've determined that this is a shadow ray and we've hit an item with no shadow casting
                        // then skip it
                        if (!material.castShadow && isShadowRay) {

                            vec3 point = rayOrigin + rayDirection * dist;
                            vec3 absPoint = abs(point);
                            float maxPoint = max(absPoint.x, max(absPoint.y, absPoint.z));
                            rayOrigin = point - (maxPoint + 1.0) * faceNormal * RAY_OFFSET;

                            continue;

                        }

                        // uv coord for textures
                        vec2 uv = textureSampleBarycoord(uvAttribute, barycoord, faceIndices.xyz).xy;
                        vec4 vertexColor = textureSampleBarycoord(colorAttribute, barycoord, faceIndices.xyz);

                        // albedo
                        vec4 albedo = vec4(material.color, material.opacity);
                        if (material.map != -1) {

                            vec3 uvPrime = material.mapTransform * vec3(uv, 1);
                            albedo *= texture2D(textures, vec3(uvPrime.xy, material.map));
                        }

                        if (material.vertexColors) {

                            albedo *= vertexColor;

                        }

                        // alphaMap
                        if (material.alphaMap != -1) {

                            albedo.a *= texture2D(textures, vec3(uv, material.alphaMap)).x;

                        }

                        // possibly skip this sample if it's transparent, alpha test is enabled, or we hit the wrong material side
                        // and it's single sided.
                        // - alpha test is disabled when it === 0
                        // - the material sidedness test is complicated because we want light to pass through the back side but still
                        // be able to see the front side. This boolean checks if the side we hit is the front side on the first ray
                        // and we're rendering the other then we skip it. Do the opposite on subsequent bounces to get incoming light.
                        float alphaTest = material.alphaTest;
                        bool useAlphaTest = alphaTest != 0.0;
                        if (
                            // material sidedness
                            material.side != 0.0 && side != material.side

                            // alpha test
                            || useAlphaTest && albedo.a < alphaTest

                            // opacity
                            || material.transparent && ! useAlphaTest && albedo.a < rand()
                        ) {

                            vec3 point = rayOrigin + rayDirection * dist;
                            vec3 absPoint = abs(point);
                            float maxPoint = max(absPoint.x, max(absPoint.y, absPoint.z));
                            rayOrigin = point - (maxPoint + 1.0) * faceNormal * RAY_OFFSET;

                            // only allow a limited number of transparency discards otherwise we could
                            // crash the context with too long a loop.
                            i -= sign(transparentTraversals);
                            transparentTraversals -= sign(transparentTraversals);
                            continue;

                        }

                        // fetch the interpolated smooth normal
                        vec3 normal = normalize(textureSampleBarycoord(
                            normalAttribute,
                            barycoord,
                            faceIndices.xyz
                        ).xyz);

                        // roughness
                        float roughness = material.roughness;
                        if (material.roughnessMap != -1) {

                            vec3 uvPrime = material.roughnessMapTransform * vec3(uv, 1);
                            roughness *= texture2D(textures, vec3(uvPrime.xy, material.roughnessMap)).g;

                        }

                        // metalness
                        float metalness = material.metalness;
                        if (material.metalnessMap != -1) {

                            vec3 uvPrime = material.metalnessMapTransform * vec3(uv, 1);
                            metalness *= texture2D(textures, vec3(uvPrime.xy, material.metalnessMap)).b;

                        }

                        // emission
                        vec3 emission = material.emissiveIntensity * material.emissive;
                        if (material.emissiveMap != -1) {

                            vec3 uvPrime = material.emissiveMapTransform * vec3(uv, 1);
                            emission *= texture2D(textures, vec3(uvPrime.xy, material.emissiveMap)).xyz;

                        }

                        // transmission
                        float transmission = material.transmission;
                        if (material.transmissionMap != -1) {

                            vec3 uvPrime = material.transmissionMapTransform * vec3(uv, 1);
                            transmission *= texture2D(textures, vec3(uvPrime.xy, material.transmissionMap)).r;

                        }

                        // normal
                        vec3 baseNormal = normal;
                        if (material.normalMap != -1) {

                            vec4 tangentSample = textureSampleBarycoord(
                                tangentAttribute,
                                barycoord,
                                faceIndices.xyz
                            );

                            // some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
                            // resulting in NaNs and slow path tracing.
                            if (length(tangentSample.xyz) > 0.0) {

                                vec3 tangent = normalize(tangentSample.xyz);
                                vec3 bitangent = normalize(cross(normal, tangent) * tangentSample.w);
                                mat3 vTBN = mat3(tangent, bitangent, normal);

                                vec3 uvPrime = material.normalMapTransform * vec3(uv, 1);
                                vec3 texNormal = texture2D(textures, vec3(uvPrime.xy, material.normalMap)).xyz * 2.0 - 1.0;
                                texNormal.xy *= material.normalScale;
                                normal = vTBN * texNormal;

                            }

                        }

                        normal *= side;

                        // clearcoat
                        float clearcoat = material.clearcoat;
                        if (material.clearcoatMap != -1) {

                            vec3 uvPrime = material.clearcoatMapTransform * vec3(uv, 1);
                            clearcoat *= texture2D(textures, vec3(uvPrime.xy, material.clearcoatMap)).r;

                        }

                        // clearcoatRoughness
                        float clearcoatRoughness = material.clearcoatRoughness;
                        if (material.clearcoatRoughnessMap != -1) {

                            vec3 uvPrime = material.clearcoatRoughnessMapTransform * vec3(uv, 1);
                            clearcoat *= texture2D(textures, vec3(uvPrime.xy, material.clearcoatRoughnessMap)).g;

                        }

                        // clearcoatNormal
                        vec3 clearcoatNormal = baseNormal;
                        if (material.clearcoatNormalMap != -1) {

                            vec4 tangentSample = textureSampleBarycoord(
                                tangentAttribute,
                                barycoord,
                                faceIndices.xyz
                            );

                            // some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
                            // resulting in NaNs and slow path tracing.
                            if (length(tangentSample.xyz) > 0.0) {

                                vec3 tangent = normalize(tangentSample.xyz);
                                vec3 bitangent = normalize(cross(clearcoatNormal, tangent) * tangentSample.w);
                                mat3 vTBN = mat3(tangent, bitangent, clearcoatNormal);

                                vec3 uvPrime = material.clearcoatNormalMapTransform * vec3(uv, 1);
                                vec3 texNormal = texture2D(textures, vec3(uvPrime.xy, material.clearcoatNormalMap)).xyz * 2.0 - 1.0;
                                texNormal.xy *= material.clearcoatNormalScale;
                                clearcoatNormal = vTBN * texNormal;

                            }

                        }

                        clearcoatNormal *= side;

                        // sheenColor
                        vec3 sheenColor = material.sheenColor;
                        if (material.sheenColorMap != -1) {

                            vec3 uvPrime = material.sheenColorMapTransform * vec3(uv, 1);
                            sheenColor *= texture2D(textures, vec3(uvPrime.xy, material.sheenColorMap)).rgb;

                        }

                        // sheenRoughness
                        float sheenRoughness = material.sheenRoughness;
                        if (material.sheenRoughnessMap != -1) {

                            vec3 uvPrime = material.sheenRoughnessMapTransform * vec3(uv, 1);
                            sheenRoughness *= texture2D(textures, vec3(uvPrime.xy, material.sheenRoughnessMap)).a;

                        }

                        // iridescence
                        float iridescence = material.iridescence;
                        if (material.iridescenceMap != -1) {

                            vec3 uvPrime = material.iridescenceMapTransform * vec3(uv, 1);
                            iridescence *= texture2D(textures, vec3(uvPrime.xy, material.iridescenceMap)).r;

                        }

                        // iridescence thickness
                        float iridescenceThickness = material.iridescenceThicknessMaximum;
                        if (material.iridescenceThicknessMap != -1) {

                            vec3 uvPrime = material.iridescenceThicknessMapTransform * vec3(uv, 1);
                            float iridescenceThicknessSampled = texture2D(textures, vec3(uvPrime.xy, material.iridescenceThicknessMap)).g;
                            iridescenceThickness = mix(material.iridescenceThicknessMinimum, material.iridescenceThicknessMaximum, iridescenceThicknessSampled);

                        }

                        iridescence = iridescenceThickness == 0.0 ? 0.0 : iridescence;

                        // specular color
                        vec3 specularColor = material.specularColor;
                        if (material.specularColorMap != -1) {

                            vec3 uvPrime = material.specularColorMapTransform * vec3(uv, 1);
                            specularColor *= texture2D(textures, vec3(uvPrime.xy, material.specularColorMap)).rgb;

                        }

                        // specular intensity
                        float specularIntensity = material.specularIntensity;
                        if (material.specularIntensityMap != -1) {

                            vec3 uvPrime = material.specularIntensityMapTransform * vec3(uv, 1);
                            specularIntensity *= texture2D(textures, vec3(uvPrime.xy, material.specularIntensityMap)).a;

                        }

                        SurfaceRec surfaceRec;
                        surfaceRec.normal = normal;
                        surfaceRec.faceNormal = faceNormal;
                        surfaceRec.transmission = transmission;
                        surfaceRec.ior = material.ior;
                        surfaceRec.emission = emission;
                        surfaceRec.metalness = metalness;
                        surfaceRec.color = albedo.rgb;
                        surfaceRec.clearcoat = clearcoat;
                        surfaceRec.sheenColor = sheenColor;
                        surfaceRec.iridescence = iridescence;
                        surfaceRec.iridescenceIor = material.iridescenceIor;
                        surfaceRec.iridescenceThickness = iridescenceThickness;
                        surfaceRec.specularColor = specularColor;
                        surfaceRec.specularIntensity = specularIntensity;
                        surfaceRec.attenuationColor = material.attenuationColor;
                        surfaceRec.attenuationDistance = material.attenuationDistance;

                        // apply perceptual roughness factor from gltf
                        // https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#microfacet-surfaces
                        surfaceRec.roughness = roughness * roughness;
                        surfaceRec.clearcoatRoughness = clearcoatRoughness * clearcoatRoughness;
                        surfaceRec.sheenRoughness = sheenRoughness * sheenRoughness;

                        // frontFace is used to determine transmissive properties and PDF. If no transmission is used
                        // then we can just always assume this is a front face.
                        surfaceRec.frontFace = side == 1.0 || transmission == 0.0;
                        surfaceRec.iorRatio = material.thinFilm || surfaceRec.frontFace ? 1.0 / material.ior : material.ior;
                        surfaceRec.thinFilm = material.thinFilm;

                        // Compute the filtered roughness value to use during specular reflection computations.
                        // The accumulated roughness value is scaled by a user setting and a "magic value" of 5.0.
                        // If we're exiting something transmissive then scale the factor down significantly so we can retain
                        // sharp internal reflections
                        surfaceRec.filteredRoughness = applyFilteredGlossy(surfaceRec.roughness, accumulatedRoughness);
                        surfaceRec.filteredClearcoatRoughness = applyFilteredGlossy(surfaceRec.clearcoatRoughness, accumulatedClearcoatRoughness);

                        mat3 normalBasis = getBasisFromNormal(surfaceRec.normal);
                        mat3 invBasis = inverse(normalBasis);

                        mat3 clearcoatNormalBasis = getBasisFromNormal(clearcoatNormal);
                        mat3 clearcoatInvBasis = inverse(clearcoatNormalBasis);

                        vec3 outgoing = -normalize(invBasis * rayDirection);
                        vec3 clearcoatOutgoing = -normalize(clearcoatInvBasis * rayDirection);
                        sampleRec = bsdfSample(outgoing, clearcoatOutgoing, normalBasis, invBasis, clearcoatNormalBasis, clearcoatInvBasis, surfaceRec);

                        isShadowRay = sampleRec.specularPdf < rand();

                        // adjust the hit point by the surface normal by a factor of some offset and the
                        // maximum component-wise value of the current point to accommodate floating point
                        // error as values increase.
                        vec3 point = rayOrigin + rayDirection * dist;
                        vec3 absPoint = abs(point);
                        float maxPoint = max(absPoint.x, max(absPoint.y, absPoint.z));
                        rayDirection = normalize(normalBasis * sampleRec.direction);

                        bool isBelowSurface = dot(rayDirection, faceNormal) < 0.0;
                        rayOrigin = point + faceNormal * (maxPoint + 1.0) * (isBelowSurface ? - RAY_OFFSET : RAY_OFFSET);

                        // direct env map sampling
                        #if FEATURE_MIS

                        // uniformly pick a light or environment map
                        if(rand() > 1.0 / float(lights.count + 1u)) {

                            // sample a light or environment
                            LightSampleRec lightSampleRec = randomLightSample(lights.tex, iesProfiles, lights.count, rayOrigin);

                            bool isSampleBelowSurface = dot(faceNormal, lightSampleRec.direction) < 0.0;
                            if (isSampleBelowSurface) {

                                lightSampleRec.pdf = 0.0;

                            }

                            // check if a ray could even reach the light area
                            if (
                                lightSampleRec.pdf > 0.0 &&
                                isDirectionValid(lightSampleRec.direction, normal, faceNormal) &&
                                ! anyCloserHit(bvh, rayOrigin, lightSampleRec.direction, lightSampleRec.dist)
                            ) {

                                // get the material pdf
                                vec3 sampleColor;
                                float lightMaterialPdf = bsdfResult(outgoing, clearcoatOutgoing, normalize(invBasis * lightSampleRec.direction), normalize(clearcoatInvBasis * lightSampleRec.direction), surfaceRec, sampleColor);
                                bool isValidSampleColor = all(greaterThanEqual(sampleColor, vec3(0.0)));
                                if (lightMaterialPdf > 0.0 && isValidSampleColor) {

                                    // weight the direct light contribution
                                    float lightPdf = lightSampleRec.pdf / float(lights.count + 1u);
                                    float misWeight = misHeuristic(lightPdf, lightMaterialPdf);
                                    gl_FragColor.rgb += lightSampleRec.emission * throughputColor * sampleColor * misWeight / lightPdf;

                                }

                            }

                        } else {

                            // find a sample in the environment map to include in the contribution
                            vec3 envColor, envDirection;
                            float envPdf = randomEnvMapSample(envMapInfo, envColor, envDirection);
                            envDirection = invEnvironmentRotation * envDirection;

                            // this env sampling is not set up for transmissive sampling and yields overly bright
                            // results so we ignore the sample in this case.
                            // TODO: this should be improved but how? The env samples could traverse a few layers?
                            bool isSampleBelowSurface = dot(faceNormal, envDirection) < 0.0;
                            if (isSampleBelowSurface) {

                                envPdf = 0.0;

                            }

                            // check if a ray could even reach the surface
                            vec3 attenuatedColor;
                            if (
                                envPdf > 0.0 &&
                                isDirectionValid(envDirection, normal, faceNormal) &&
                                ! attenuateHit(bvh, rayOrigin, envDirection, bounces - i, isShadowRay, attenuatedColor)
                            ) {

                                // get the material pdf
                                vec3 sampleColor;
                                float envMaterialPdf = bsdfResult(outgoing, clearcoatOutgoing, normalize(invBasis * envDirection), normalize(clearcoatInvBasis * envDirection), surfaceRec, sampleColor);
                                bool isValidSampleColor = all(greaterThanEqual(sampleColor, vec3(0.0)));
                                if (envMaterialPdf > 0.0 && isValidSampleColor) {

                                    // weight the direct light contribution
                                    envPdf /= float(lights.count + 1u);
                                    float misWeight = misHeuristic(envPdf, envMaterialPdf);
                                    gl_FragColor.rgb += attenuatedColor * environmentIntensity * envColor * throughputColor * sampleColor * misWeight / envPdf;

                                }

                            }

                        }
                        #endif

                        // accumulate a roughness value to offset diffuse, specular, diffuse rays that have high contribution
                        // to a single pixel resulting in fireflies
                        if (!isBelowSurface) {

                            // determine if this is a rough normal or not by checking how far off straight up it is
                            vec3 halfVector = normalize(outgoing + sampleRec.direction);
                            accumulatedRoughness += sin(acosApprox(halfVector.z));

                            vec3 clearcoatHalfVector = normalize(clearcoatOutgoing + sampleRec.clearcoatDirection);
                            accumulatedClearcoatRoughness += sin(acosApprox(clearcoatHalfVector.z));

                            transmissiveRay = false;

                        }

                        // accumulate color
                        gl_FragColor.rgb += (emission * throughputColor);

                        // skip the sample if our PDF or ray is impossible
                        if (sampleRec.pdf <= 0.0 || ! isDirectionValid(rayDirection, normal, faceNormal)) {

                            break;

                        }

                        throughputColor *= sampleRec.color / sampleRec.pdf;

                        // attenuate the throughput color by the medium color
                        if (side == -1.0) {

                            throughputColor *= transmissionAttenuation(dist, surfaceRec.attenuationColor, surfaceRec.attenuationDistance);

                        }

                        // discard the sample if there are any NaNs
                        if (any(isnan(throughputColor)) || any(isinf(throughputColor))) {

                            break;

                        }

                    }

                    gl_FragColor.a *= opacity;

                }

            `

        });

        this.setValues(parameters);

    }

}

// core

export { BlurredEnvMapGenerator, DenoiseMaterial, DynamicPathTracingSceneGenerator, EquirectCamera, EquirectHdrInfoUniform, GraphMaterial, IESLoader, IESProfilesTexture, LightsInfoUniformStruct, MaterialBase, MaterialReducer, MaterialsTexture, PathTracingRenderer, PathTracingSceneGenerator, PhysicalCamera, PhysicalCameraUniform, PhysicalPathTracingMaterial, PhysicalSpotLight, RenderTarget2DArray, ShapedAreaLight, getGroupMaterialIndicesAttribute, mergeMeshes, setCommonAttributes, shaderLightStruct, shaderMaterialSampling, shaderMaterialStructs, shaderUtils, trimToAttributes };
//# sourceMappingURL=index.module.js.map
