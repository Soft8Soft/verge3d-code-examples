
import * as v3d from "../../../build/v3d.module.js";


/**
 * @author LeonYuanYao / https://github.com/LeonYuanYao
 * 
 * Octahedron and Quantization encodings based on work by:
 * @auther Tarek Sherif @tsherif
 * @link https://github.com/tsherif/mesh-quantization-example
 * 
 */
var GeometryCompressionUtils = {

    /**
     * Make the input mesh.geometry's normal attribute encoded and compressed by 3 different methods. 
     * Also will change the mesh.material to `PackedPhongMaterial` which let the vertex shader program decode the normal data. 
     *
     * @param {v3d.Mesh} mesh
     * @param {String} encodeMethod    "DEFAULT" || "OCT1Byte" || "OCT2Byte" || "ANGLES"
     * 
     */
    compressNormals: function(mesh, encodeMethod) {

        if (!mesh.geometry) {
            console.error("Mesh must contain geometry. ");
        }

        let normal = mesh.geometry.attributes.normal;

        if (!normal) {
            console.error("Geometry must contain normal attribute. ");
        }

        if (normal.isPacked) return;

        if (normal.itemSize != 3) {
            console.error("normal.itemSize is not 3, which cannot be encoded. ");
        }

        let array = normal.array;
        let count = normal.count;

        let result;
        if (encodeMethod == "DEFAULT") {

            result = new Uint8Array(count * 3);

            for (let idx = 0; idx < array.length; idx += 3) {

                let encoded;

                encoded = this.EncodingFuncs.defaultEncode(array[idx], array[idx + 1], array[idx + 2], 1);

                result[idx + 0] = encoded[0];
                result[idx + 1] = encoded[1];
                result[idx + 2] = encoded[2];

            }

            mesh.geometry.setAttribute('normal', new v3d.BufferAttribute(result, 3, true));
            mesh.geometry.attributes.normal.bytes = result.length * 1;

        } else if (encodeMethod == "OCT1Byte") {

            result = new Int8Array(count * 2);

            for (let idx = 0; idx < array.length; idx += 3) {

                let encoded;

                encoded = this.EncodingFuncs.octEncodeBest(array[idx], array[idx + 1], array[idx + 2], 1);

                result[idx / 3 * 2 + 0] = encoded[0];
                result[idx / 3 * 2 + 1] = encoded[1];

            }

            mesh.geometry.setAttribute('normal', new v3d.BufferAttribute(result, 2, true));
            mesh.geometry.attributes.normal.bytes = result.length * 1;

        } else if (encodeMethod == "OCT2Byte") {

            result = new Int16Array(count * 2);

            for (let idx = 0; idx < array.length; idx += 3) {

                let encoded;

                encoded = this.EncodingFuncs.octEncodeBest(array[idx], array[idx + 1], array[idx + 2], 2);

                result[idx / 3 * 2 + 0] = encoded[0];
                result[idx / 3 * 2 + 1] = encoded[1];

            }

            mesh.geometry.setAttribute('normal', new v3d.BufferAttribute(result, 2, true));
            mesh.geometry.attributes.normal.bytes = result.length * 2;

        } else if (encodeMethod == "ANGLES") {

            result = new Uint16Array(count * 2);

            for (let idx = 0; idx < array.length; idx += 3) {

                let encoded;

                encoded = this.EncodingFuncs.anglesEncode(array[idx], array[idx + 1], array[idx + 2]);

                result[idx / 3 * 2 + 0] = encoded[0];
                result[idx / 3 * 2 + 1] = encoded[1];

            }

            mesh.geometry.setAttribute('normal', new v3d.BufferAttribute(result, 2, true));
            mesh.geometry.attributes.normal.bytes = result.length * 2;

        } else {

            console.error("Unrecognized encoding method, should be `DEFAULT` or `ANGLES` or `OCT`. ");

        }

        mesh.geometry.attributes.normal.needsUpdate = true;
        mesh.geometry.attributes.normal.isPacked = true;
        mesh.geometry.attributes.normal.packingMethod = encodeMethod;

        // modify material
        if (!(mesh.material instanceof PackedPhongMaterial)) {
            mesh.material = new PackedPhongMaterial().copy(mesh.material);
        }

        if (encodeMethod == "ANGLES") {
            mesh.material.defines.USE_PACKED_NORMAL = 0;
        }
        if (encodeMethod == "OCT1Byte") {
            mesh.material.defines.USE_PACKED_NORMAL = 1;
        }
        if (encodeMethod == "OCT2Byte") {
            mesh.material.defines.USE_PACKED_NORMAL = 1;
        }
        if (encodeMethod == "DEFAULT") {
            mesh.material.defines.USE_PACKED_NORMAL = 2;
        }

    },


    /**
     * Make the input mesh.geometry's position attribute encoded and compressed. 
     * Also will change the mesh.material to `PackedPhongMaterial` which let the vertex shader program decode the position data. 
     *
     * @param {v3d.Mesh} mesh
     * 
     */
    compressPositions: function(mesh) {

        if (!mesh.geometry) {
            console.error("Mesh must contain geometry. ");
        }

        let position = mesh.geometry.attributes.position;

        if (!position) {
            console.error("Geometry must contain position attribute. ");
        }

        if (position.isPacked) return;

        if (position.itemSize != 3) {
            console.error("position.itemSize is not 3, which cannot be packed. ");
        }

        let array = position.array;
        let count = position.count;
        let encodingBytes = 2;

        let result = this.EncodingFuncs.quantizedEncode(array, encodingBytes);

        let quantized = result.quantized;
        let decodeMat = result.decodeMat;

        // IMPORTANT: calculate original geometry bounding info first, before updating packed positions
        if (mesh.geometry.boundingBox == null) mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingSphere == null) mesh.geometry.computeBoundingSphere();

        mesh.geometry.setAttribute('position', new v3d.BufferAttribute(quantized, 3));
        mesh.geometry.attributes.position.isPacked = true;
        mesh.geometry.attributes.position.needsUpdate = true;
        mesh.geometry.attributes.position.bytes = quantized.length * encodingBytes;

        // modify material
        if (!(mesh.material instanceof PackedPhongMaterial)) {
            mesh.material = new PackedPhongMaterial().copy(mesh.material);
        }

        mesh.material.defines.USE_PACKED_POSITION = 0;

        mesh.material.uniforms.quantizeMatPos.value = decodeMat;
        mesh.material.uniforms.quantizeMatPos.needsUpdate = true;

    },

    /**
     * Make the input mesh.geometry's uv attribute encoded and compressed. 
     * Also will change the mesh.material to `PackedPhongMaterial` which let the vertex shader program decode the uv data. 
     *
     * @param {v3d.Mesh} mesh
     * 
     */
    compressUvs: function(mesh) {

        if (!mesh.geometry) {
            console.error("Mesh must contain geometry property. ");
        }

        let uvs = mesh.geometry.attributes.uv;

        if (!uvs) {
            console.error("Geometry must contain uv attribute. ");
        }

        if (uvs.isPacked) return;

        let range = { min: Infinity, max: -Infinity };

        let array = uvs.array;
        let count = uvs.count;

        for (let i = 0; i < array.length; i++) {
            range.min = Math.min(range.min, array[i]);
            range.max = Math.max(range.max, array[i]);
        }

        let result;

        if (range.min >= -1.0 && range.max <= 1.0) {

            // use default encoding method
            result = new Uint16Array(array.length);

            for (let i = 0; i < array.length; i += 2) {

                let encoded = this.EncodingFuncs.defaultEncode(array[i], array[i + 1], 0, 2);

                result[i] = encoded[0];
                result[i + 1] = encoded[1];

            }

            mesh.geometry.setAttribute('uv', new v3d.BufferAttribute(result, 2, true));
            mesh.geometry.attributes.uv.isPacked = true;
            mesh.geometry.attributes.uv.needsUpdate = true;
            mesh.geometry.attributes.uv.bytes = result.length * 2;

            if (!(mesh.material instanceof PackedPhongMaterial)) {
                mesh.material = new PackedPhongMaterial().copy(mesh.material);
            }

            mesh.material.defines.USE_PACKED_UV = 0;

        } else {

            // use quantized encoding method
            result = this.EncodingFuncs.quantizedEncodeUV(array, 2);

            mesh.geometry.setAttribute('uv', new v3d.BufferAttribute(result.quantized, 2));
            mesh.geometry.attributes.uv.isPacked = true;
            mesh.geometry.attributes.uv.needsUpdate = true;
            mesh.geometry.attributes.uv.bytes = result.quantized.length * 2;

            if (!(mesh.material instanceof PackedPhongMaterial)) {
                mesh.material = new PackedPhongMaterial().copy(mesh.material);
            }

            mesh.material.defines.USE_PACKED_UV = 1;

            mesh.material.uniforms.quantizeMatUV.value = result.decodeMat;
            mesh.material.uniforms.quantizeMatUV.needsUpdate = true;

        }




    },


    EncodingFuncs: {

        defaultEncode: function(x, y, z, bytes) {
            if (bytes == 1) {
                let tmpx = Math.round((x + 1) * 0.5 * 255);
                let tmpy = Math.round((y + 1) * 0.5 * 255);
                let tmpz = Math.round((z + 1) * 0.5 * 255);
                return new Uint8Array([tmpx, tmpy, tmpz]);
            } else if (bytes == 2) {
                let tmpx = Math.round((x + 1) * 0.5 * 65535);
                let tmpy = Math.round((y + 1) * 0.5 * 65535);
                let tmpz = Math.round((z + 1) * 0.5 * 65535);
                return new Uint16Array([tmpx, tmpy, tmpz]);
            } else {
                console.error("number of bytes must be 1 or 2");
            }
        },

        defaultDecode: function(array, bytes) {
            if (bytes == 1) {
                return [
                    ((array[0] / 255) * 2.0) - 1.0,
                    ((array[1] / 255) * 2.0) - 1.0,
                    ((array[2] / 255) * 2.0) - 1.0,
                ]
            } else if (bytes == 2) {
                return [
                    ((array[0] / 65535) * 2.0) - 1.0,
                    ((array[1] / 65535) * 2.0) - 1.0,
                    ((array[2] / 65535) * 2.0) - 1.0,
                ]
            } else {
                console.error("number of bytes must be 1 or 2");
            }

        },

        // for `Angles` encoding
        anglesEncode: function(x, y, z) {
            let normal0 = parseInt(0.5 * (1.0 + Math.atan2(y, x) / Math.PI) * 65535);
            let normal1 = parseInt(0.5 * (1.0 + z) * 65535);
            return new Uint16Array([normal0, normal1]);
        },

        // for `OCT` encoding
        octEncodeBest: function(x, y, z, bytes) {
            var oct, dec, best, currentCos, bestCos;

            // Test various combinations of ceil and floor
            // to minimize rounding errors
            best = oct = octEncodeVec3(x, y, z, "floor", "floor");
            dec = octDecodeVec2(oct);
            currentCos = bestCos = dot(x, y, z, dec);

            oct = octEncodeVec3(x, y, z, "ceil", "floor");
            dec = octDecodeVec2(oct);
            currentCos = dot(x, y, z, dec);

            if (currentCos > bestCos) {
                best = oct;
                bestCos = currentCos;
            }

            oct = octEncodeVec3(x, y, z, "floor", "ceil");
            dec = octDecodeVec2(oct);
            currentCos = dot(x, y, z, dec);

            if (currentCos > bestCos) {
                best = oct;
                bestCos = currentCos;
            }

            oct = octEncodeVec3(x, y, z, "ceil", "ceil");
            dec = octDecodeVec2(oct);
            currentCos = dot(x, y, z, dec);

            if (currentCos > bestCos) {
                best = oct;
                bestCos = currentCos;
            }

            return best;

            function octEncodeVec3(x0, y0, z0, xfunc, yfunc) {
                var x = x0 / (Math.abs(x0) + Math.abs(y0) + Math.abs(z0));
                var y = y0 / (Math.abs(x0) + Math.abs(y0) + Math.abs(z0));

                if (z < 0) {
                    var tempx = x;
                    var tempy = y;
                    tempx = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
                    tempy = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
                    x = tempx;
                    y = tempy;

                    var diff = 1 - Math.abs(x) - Math.abs(y);
                    if (diff > 0) {
                        diff += 0.001
                        x += x > 0 ? diff / 2 : -diff / 2;
                        y += y > 0 ? diff / 2 : -diff / 2;
                    }

                }

                if (bytes == 1) {
                    return new Int8Array([
                        Math[xfunc](x * 127.5 + (x < 0 ? 1 : 0)),
                        Math[yfunc](y * 127.5 + (y < 0 ? 1 : 0))
                    ]);
                }
                if (bytes == 2) {
                    return new Int16Array([
                        Math[xfunc](x * 32767.5 + (x < 0 ? 1 : 0)),
                        Math[yfunc](y * 32767.5 + (y < 0 ? 1 : 0))
                    ]);
                }


            }

            function octDecodeVec2(oct) {
                var x = oct[0];
                var y = oct[1];

                if (bytes == 1) {
                    x /= x < 0 ? 127 : 128;
                    y /= y < 0 ? 127 : 128;
                } else if (bytes == 2) {
                    x /= x < 0 ? 32767 : 32768;
                    y /= y < 0 ? 32767 : 32768;
                }
                

                var z = 1 - Math.abs(x) - Math.abs(y);

                if (z < 0) {
                    var tmpx = x;
                    x = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
                    y = (1 - Math.abs(tmpx)) * (y >= 0 ? 1 : -1);
                }

                var length = Math.sqrt(x * x + y * y + z * z);

                return [
                    x / length,
                    y / length,
                    z / length
                ];
            }

            function dot(x, y, z, vec3) {
                return x * vec3[0] + y * vec3[1] + z * vec3[2];
            }
        },

        quantizedEncode: function(array, bytes) {

            let quantized, segments;

            if (bytes == 1) {
                quantized = new Uint8Array(array.length);
                segments = 255;
            } else if (bytes == 2) {
                quantized = new Uint16Array(array.length);
                segments = 65535;
            } else {
                console.error("number of bytes error! ");
            }

            let decodeMat = new v3d.Matrix4();

            let min = new Float32Array(3);
            let max = new Float32Array(3);

            min[0] = min[1] = min[2] = Number.MAX_VALUE;
            max[0] = max[1] = max[2] = -Number.MAX_VALUE;

            for (let i = 0; i < array.length; i += 3) {
                min[0] = Math.min(min[0], array[i + 0]);
                min[1] = Math.min(min[1], array[i + 1]);
                min[2] = Math.min(min[2], array[i + 2]);
                max[0] = Math.max(max[0], array[i + 0]);
                max[1] = Math.max(max[1], array[i + 1]);
                max[2] = Math.max(max[2], array[i + 2]);
            }

            decodeMat.scale(new v3d.Vector3(
                (max[0] - min[0]) / segments,
                (max[1] - min[1]) / segments,
                (max[2] - min[2]) / segments
            ));

            decodeMat.elements[12] = min[0];
            decodeMat.elements[13] = min[1];
            decodeMat.elements[14] = min[2];

            decodeMat.transpose();


            let multiplier = new Float32Array([
                max[0] !== min[0] ? segments / (max[0] - min[0]) : 0,
                max[1] !== min[1] ? segments / (max[1] - min[1]) : 0,
                max[2] !== min[2] ? segments / (max[2] - min[2]) : 0
            ]);

            for (let i = 0; i < array.length; i += 3) {
                quantized[i + 0] = Math.floor((array[i + 0] - min[0]) * multiplier[0]);
                quantized[i + 1] = Math.floor((array[i + 1] - min[1]) * multiplier[1]);
                quantized[i + 2] = Math.floor((array[i + 2] - min[2]) * multiplier[2]);
            }

            return {
                quantized: quantized,
                decodeMat: decodeMat
            };
        },


        quantizedEncodeUV: function(array, bytes) {

            let quantized, segments;

            if (bytes == 1) {
                quantized = new Uint8Array(array.length);
                segments = 255;
            } else if (bytes == 2) {
                quantized = new Uint16Array(array.length);
                segments = 65535;
            } else {
                console.error("number of bytes error! ");
            }

            let decodeMat = new v3d.Matrix3();

            let min = new Float32Array(2);
            let max = new Float32Array(2);

            min[0] = min[1] = Number.MAX_VALUE;
            max[0] = max[1] = -Number.MAX_VALUE;

            for (let i = 0; i < array.length; i += 2) {
                min[0] = Math.min(min[0], array[i + 0]);
                min[1] = Math.min(min[1], array[i + 1]);
                max[0] = Math.max(max[0], array[i + 0]);
                max[1] = Math.max(max[1], array[i + 1]);
            }

            decodeMat.scale(
                (max[0] - min[0]) / segments,
                (max[1] - min[1]) / segments
            );

            decodeMat.elements[6] = min[0];
            decodeMat.elements[7] = min[1];

            decodeMat.transpose();

            let multiplier = new Float32Array([
                max[0] !== min[0] ? segments / (max[0] - min[0]) : 0,
                max[1] !== min[1] ? segments / (max[1] - min[1]) : 0
            ]);

            for (let i = 0; i < array.length; i += 2) {
                quantized[i + 0] = Math.floor((array[i + 0] - min[0]) * multiplier[0]);
                quantized[i + 1] = Math.floor((array[i + 1] - min[1]) * multiplier[1]);
            }

            return {
                quantized: quantized,
                decodeMat: decodeMat
            };
        }

    }

};



/**
 * `PackedPhongMaterial` inherited from v3d.MeshPhongMaterial
 * 
 * @param {Object} parameters 
 */
function PackedPhongMaterial(parameters) {
    v3d.MeshPhongMaterial.call(this);
    this.defines = {};
    this.type = 'PackedPhongMaterial';
    this.uniforms = v3d.UniformsUtils.merge([

        v3d.ShaderLib.phong.uniforms,

        {
            quantizeMatPos: { value: null },
            quantizeMatUV: { value: null }
        }

    ]);

    this.vertexShader = [
        "#define PHONG",

        "varying vec3 vViewPosition;",

        "#ifndef FLAT_SHADED",
        "varying vec3 vNormal;",
        "#endif",

        v3d.ShaderChunk.common,
        v3d.ShaderChunk.uv_pars_vertex,
        v3d.ShaderChunk.uv2_pars_vertex,
        v3d.ShaderChunk.displacementmap_pars_vertex,
        v3d.ShaderChunk.envmap_pars_vertex,
        v3d.ShaderChunk.color_pars_vertex,
        v3d.ShaderChunk.fog_pars_vertex,
        v3d.ShaderChunk.morphtarget_pars_vertex,
        v3d.ShaderChunk.skinning_pars_vertex,
        v3d.ShaderChunk.shadowmap_pars_vertex,
        v3d.ShaderChunk.logdepthbuf_pars_vertex,
        v3d.ShaderChunk.clipping_planes_pars_vertex,

        `#ifdef USE_PACKED_NORMAL
            #if USE_PACKED_NORMAL == 0
                vec3 decodeNormal(vec3 packedNormal)
                { 
                    float x = packedNormal.x * 2.0 - 1.0;
                    float y = packedNormal.y * 2.0 - 1.0;
                    vec2 scth = vec2(sin(x * PI), cos(x * PI));
                    vec2 scphi = vec2(sqrt(1.0 - y * y), y); 
                    return normalize(vec3(scth.y * scphi.x, scth.x * scphi.x, scphi.y));
                } 
            #endif

            #if USE_PACKED_NORMAL == 1
                vec3 decodeNormal(vec3 packedNormal)
                { 
                    vec3 v = vec3(packedNormal.xy, 1.0 - abs(packedNormal.x) - abs(packedNormal.y));
                    if (v.z < 0.0) 
                    {
                        v.xy = (1.0 - abs(v.yx)) * vec2((v.x >= 0.0) ? +1.0 : -1.0, (v.y >= 0.0) ? +1.0 : -1.0);
                    }
                    return normalize(v);
                }
            #endif

            #if USE_PACKED_NORMAL == 2
                vec3 decodeNormal(vec3 packedNormal)
                {
                    vec3 v = (packedNormal * 2.0) - 1.0;
                    return normalize(v);
                }
            #endif
        #endif`,

        `#ifdef USE_PACKED_POSITION
            #if USE_PACKED_POSITION == 0
                uniform mat4 quantizeMatPos;
            #endif
        #endif`,

        `#ifdef USE_PACKED_UV
            #if USE_PACKED_UV == 1
                uniform mat3 quantizeMatUV;
            #endif
        #endif`,

        `#ifdef USE_PACKED_UV
            #if USE_PACKED_UV == 0
                vec2 decodeUV(vec2 packedUV)
                {
                    vec2 uv = (packedUV * 2.0) - 1.0;
                    return uv;
                }
            #endif

            #if USE_PACKED_UV == 1
                vec2 decodeUV(vec2 packedUV)
                {
                    vec2 uv = (vec3(packedUV, 1.0) * quantizeMatUV).xy;
                    return uv;
                }
            #endif
        #endif`,

        "void main() {",

        v3d.ShaderChunk.uv_vertex,

        `
        #ifdef USE_UV
            #ifdef USE_PACKED_UV
                vUv = decodeUV(vUv);
            #endif
        #endif
        `,

        v3d.ShaderChunk.uv2_vertex,
        v3d.ShaderChunk.color_vertex,
        v3d.ShaderChunk.beginnormal_vertex,

        `#ifdef USE_PACKED_NORMAL
            objectNormal = decodeNormal(objectNormal);
        #endif

        #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
        #endif
        `,

        v3d.ShaderChunk.morphnormal_vertex,
        v3d.ShaderChunk.skinbase_vertex,
        v3d.ShaderChunk.skinnormal_vertex,
        v3d.ShaderChunk.defaultnormal_vertex,

        "#ifndef FLAT_SHADED",
        "vNormal = normalize(transformedNormal);",
        "#endif",

        v3d.ShaderChunk.begin_vertex,

        `#ifdef USE_PACKED_POSITION
            #if USE_PACKED_POSITION == 0
                transformed = (vec4(transformed, 1.0) * quantizeMatPos).xyz;
            #endif
        #endif`,

        v3d.ShaderChunk.morphtarget_vertex,
        v3d.ShaderChunk.skinning_vertex,
        v3d.ShaderChunk.displacementmap_vertex,
        v3d.ShaderChunk.project_vertex,
        v3d.ShaderChunk.logdepthbuf_vertex,
        v3d.ShaderChunk.clipping_planes_vertex,

        "vViewPosition = - mvPosition.xyz;",

        v3d.ShaderChunk.worldpos_vertex,
        v3d.ShaderChunk.envmap_vertex,
        v3d.ShaderChunk.shadowmap_vertex,
        v3d.ShaderChunk.fog_vertex,

        "}",
    ].join("\n");

    this.fragmentShader = [
        "#define PHONG",

        "uniform vec3 diffuse;",
        "uniform vec3 emissive;",
        "uniform vec3 specular;",
        "uniform float shininess;",
        "uniform float opacity;",

        v3d.ShaderChunk.common,
        v3d.ShaderChunk.packing,
        v3d.ShaderChunk.dithering_pars_fragment,
        v3d.ShaderChunk.color_pars_fragment,
        v3d.ShaderChunk.uv_pars_fragment,
        v3d.ShaderChunk.uv2_pars_fragment,
        v3d.ShaderChunk.map_pars_fragment,
        v3d.ShaderChunk.alphamap_pars_fragment,
        v3d.ShaderChunk.aomap_pars_fragment,
        v3d.ShaderChunk.lightmap_pars_fragment,
        v3d.ShaderChunk.emissivemap_pars_fragment,
        v3d.ShaderChunk.envmap_common_pars_fragment,
        v3d.ShaderChunk.envmap_pars_fragment,
        v3d.ShaderChunk.cube_uv_reflection_fragment,
        v3d.ShaderChunk.fog_pars_fragment,
        v3d.ShaderChunk.bsdfs,
        v3d.ShaderChunk.lights_pars_begin,
        v3d.ShaderChunk.lights_phong_pars_fragment,
        v3d.ShaderChunk.shadowmap_pars_fragment,
        v3d.ShaderChunk.bumpmap_pars_fragment,
        v3d.ShaderChunk.normalmap_pars_fragment,
        v3d.ShaderChunk.specularmap_pars_fragment,
        v3d.ShaderChunk.logdepthbuf_pars_fragment,
        v3d.ShaderChunk.clipping_planes_pars_fragment,

        "void main() {",

        v3d.ShaderChunk.clipping_planes_fragment,

        "vec4 diffuseColor = vec4(diffuse, opacity);",
        "ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));",
        "vec3 totalEmissiveRadiance = emissive;",

        v3d.ShaderChunk.logdepthbuf_fragment,
        v3d.ShaderChunk.map_fragment,
        v3d.ShaderChunk.color_fragment,
        v3d.ShaderChunk.alphamap_fragment,
        v3d.ShaderChunk.alphatest_fragment,
        v3d.ShaderChunk.specularmap_fragment,
        v3d.ShaderChunk.normal_fragment_begin,
        v3d.ShaderChunk.normal_fragment_maps,
        v3d.ShaderChunk.emissivemap_fragment,

        // accumulation
        v3d.ShaderChunk.lights_phong_fragment,
        v3d.ShaderChunk.lights_fragment_begin,
        v3d.ShaderChunk.lights_fragment_maps,
        v3d.ShaderChunk.lights_fragment_end,

        // modulation
        v3d.ShaderChunk.aomap_fragment,

        "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;",

        v3d.ShaderChunk.envmap_fragment,

        "gl_FragColor = vec4(outgoingLight, diffuseColor.a);",

        v3d.ShaderChunk.tonemapping_fragment,
        v3d.ShaderChunk.encodings_fragment,
        v3d.ShaderChunk.fog_fragment,
        v3d.ShaderChunk.premultiplied_alpha_fragment,
        v3d.ShaderChunk.dithering_fragment,
        "}",
    ].join("\n");

    this.setValues(parameters);
}

PackedPhongMaterial.prototype = Object.create(v3d.MeshPhongMaterial.prototype);

export { GeometryCompressionUtils, PackedPhongMaterial };