(function() {

    /**
 * `PackedPhongMaterial` inherited from v3d.MeshPhongMaterial
 *
 * @param {Object} parameters
 */

    class PackedPhongMaterial extends v3d.MeshPhongMaterial {

        constructor(parameters) {

            super();
            this.defines = {};
            this.type = 'PackedPhongMaterial';
            this.uniforms = v3d.UniformsUtils.merge([v3d.ShaderLib.phong.uniforms, {
                quantizeMatPos: {
                    value: null
                },
                quantizeMatUV: {
                    value: null
                }
            }]);
            this.vertexShader = ['#define PHONG', 'varying vec3 vViewPosition;', v3d.ShaderChunk.common, v3d.ShaderChunk.uv_pars_vertex, v3d.ShaderChunk.uv2_pars_vertex, v3d.ShaderChunk.displacementmap_pars_vertex, v3d.ShaderChunk.envmap_pars_vertex, v3d.ShaderChunk.color_pars_vertex, v3d.ShaderChunk.fog_pars_vertex, v3d.ShaderChunk.normal_pars_vertex, v3d.ShaderChunk.morphtarget_pars_vertex, v3d.ShaderChunk.skinning_pars_vertex, v3d.ShaderChunk.shadowmap_pars_vertex, v3d.ShaderChunk.logdepthbuf_pars_vertex, v3d.ShaderChunk.clipping_planes_pars_vertex, `#ifdef USE_PACKED_NORMAL
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
                #endif`, `#ifdef USE_PACKED_POSITION
                    #if USE_PACKED_POSITION == 0
                        uniform mat4 quantizeMatPos;
                    #endif
                #endif`, `#ifdef USE_PACKED_UV
                    #if USE_PACKED_UV == 1
                        uniform mat3 quantizeMatUV;
                    #endif
                #endif`, `#ifdef USE_PACKED_UV
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
                #endif`, 'void main() {', v3d.ShaderChunk.uv_vertex, `#ifdef USE_UV
                    #ifdef USE_PACKED_UV
                        vUv = decodeUV(vUv);
                    #endif
                #endif`, v3d.ShaderChunk.uv2_vertex, v3d.ShaderChunk.color_vertex, v3d.ShaderChunk.beginnormal_vertex, `#ifdef USE_PACKED_NORMAL
                    objectNormal = decodeNormal(objectNormal);
                #endif

                #ifdef USE_TANGENT
                    vec3 objectTangent = vec3(tangent.xyz);
                #endif
                `, v3d.ShaderChunk.morphnormal_vertex, v3d.ShaderChunk.skinbase_vertex, v3d.ShaderChunk.skinnormal_vertex, v3d.ShaderChunk.defaultnormal_vertex, v3d.ShaderChunk.normal_vertex, v3d.ShaderChunk.begin_vertex, `#ifdef USE_PACKED_POSITION
                    #if USE_PACKED_POSITION == 0
                        transformed = (vec4(transformed, 1.0) * quantizeMatPos).xyz;
                    #endif
                #endif`, v3d.ShaderChunk.morphtarget_vertex, v3d.ShaderChunk.skinning_vertex, v3d.ShaderChunk.displacementmap_vertex, v3d.ShaderChunk.project_vertex, v3d.ShaderChunk.logdepthbuf_vertex, v3d.ShaderChunk.clipping_planes_vertex, 'vViewPosition = -mvPosition.xyz;', v3d.ShaderChunk.worldpos_vertex, v3d.ShaderChunk.envmap_vertex, v3d.ShaderChunk.shadowmap_vertex, v3d.ShaderChunk.fog_vertex, '}'].join('\n'); // Use the original v3d.MeshPhongMaterial's fragmentShader.

            this.fragmentShader = ['#define PHONG', 'uniform vec3 diffuse;', 'uniform vec3 emissive;', 'uniform vec3 specular;', 'uniform float shininess;', 'uniform float opacity;', v3d.ShaderChunk.common, v3d.ShaderChunk.packing, v3d.ShaderChunk.dithering_pars_fragment, v3d.ShaderChunk.color_pars_fragment, v3d.ShaderChunk.uv_pars_fragment, v3d.ShaderChunk.uv2_pars_fragment, v3d.ShaderChunk.map_pars_fragment, v3d.ShaderChunk.alphamap_pars_fragment, v3d.ShaderChunk.aomap_pars_fragment, v3d.ShaderChunk.lightmap_pars_fragment, v3d.ShaderChunk.emissivemap_pars_fragment, v3d.ShaderChunk.envmap_common_pars_fragment, v3d.ShaderChunk.envmap_pars_fragment, v3d.ShaderChunk.cube_uv_reflection_fragment, v3d.ShaderChunk.fog_pars_fragment, v3d.ShaderChunk.bsdfs, v3d.ShaderChunk.lights_pars_begin, v3d.ShaderChunk.normal_pars_fragment, v3d.ShaderChunk.lights_phong_pars_fragment, v3d.ShaderChunk.shadowmap_pars_fragment, v3d.ShaderChunk.bumpmap_pars_fragment, v3d.ShaderChunk.normalmap_pars_fragment, v3d.ShaderChunk.specularmap_pars_fragment, v3d.ShaderChunk.logdepthbuf_pars_fragment, v3d.ShaderChunk.clipping_planes_pars_fragment, 'void main() {', v3d.ShaderChunk.clipping_planes_fragment, 'vec4 diffuseColor = vec4(diffuse, opacity);', 'ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));', 'vec3 totalEmissiveRadiance = emissive;', v3d.ShaderChunk.logdepthbuf_fragment, v3d.ShaderChunk.map_fragment, v3d.ShaderChunk.color_fragment, v3d.ShaderChunk.alphamap_fragment, v3d.ShaderChunk.alphatest_fragment, v3d.ShaderChunk.specularmap_fragment, v3d.ShaderChunk.normal_fragment_begin, v3d.ShaderChunk.normal_fragment_maps, v3d.ShaderChunk.emissivemap_fragment, // accumulation
                v3d.ShaderChunk.lights_phong_fragment, v3d.ShaderChunk.lights_fragment_begin, v3d.ShaderChunk.lights_fragment_maps, v3d.ShaderChunk.lights_fragment_end, // modulation
                v3d.ShaderChunk.aomap_fragment, 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;', v3d.ShaderChunk.envmap_fragment, 'gl_FragColor = vec4(outgoingLight, diffuseColor.a);', v3d.ShaderChunk.tonemapping_fragment, v3d.ShaderChunk.encodings_fragment, v3d.ShaderChunk.fog_fragment, v3d.ShaderChunk.premultiplied_alpha_fragment, v3d.ShaderChunk.dithering_fragment, '}'].join('\n');
            this.setValues(parameters);

        }

    }

    v3d.PackedPhongMaterial = PackedPhongMaterial;

})();
