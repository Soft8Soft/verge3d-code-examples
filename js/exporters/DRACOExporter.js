/**
 * Export draco compressed files from threejs geometry objects.
 *
 * Draco files are compressed and usually are smaller than conventional 3D file formats.
 *
 * The exporter receives a options object containing
 *  - decodeSpeed, indicates how to tune the encoder regarding decode speed (0 gives better speed but worst quality)
 *  - encodeSpeed, indicates how to tune the encoder parameters (0 gives better speed but worst quality)
 *  - encoderMethod
 *  - quantization, indicates the presision of each type of data stored in the draco file in the order (POSITION, NORMAL, COLOR, TEX_COORD, GENERIC)
 *  - exportUvs
 *  - exportNormals
 */

/* global DracoEncoderModule */

v3d.DRACOExporter = function() {};

v3d.DRACOExporter.prototype = {

    constructor: v3d.DRACOExporter,

    parse: function(object, options) {

        if (object.isBufferGeometry === true || object.isGeometry === true) {

            throw new Error('DRACOExporter: The first parameter of parse() is now an instance of Mesh or Points.');

        }

        if (DracoEncoderModule === undefined) {

            throw new Error('v3d.DRACOExporter: required the draco_decoder to work.');

        }

        if (options === undefined) {

            options = {

                decodeSpeed: 5,
                encodeSpeed: 5,
                encoderMethod: v3d.DRACOExporter.MESH_EDGEBREAKER_ENCODING,
                quantization: [16, 8, 8, 8, 8],
                exportUvs: true,
                exportNormals: true,
                exportColor: false,

            };

        }

        var geometry = object.geometry;

        var dracoEncoder = DracoEncoderModule();
        var encoder = new dracoEncoder.Encoder();
        var builder;
        var dracoObject;

        if (geometry.isGeometry === true) {

            var bufferGeometry = new v3d.BufferGeometry();
            bufferGeometry.setFromObject(object);
            geometry = bufferGeometry;

        }

        if (geometry.isBufferGeometry !== true) {

            throw new Error('v3d.DRACOExporter.parse(geometry, options): geometry is not a v3d.Geometry or v3d.BufferGeometry instance.');

        }

        if (object.isMesh === true) {

            builder = new dracoEncoder.MeshBuilder();
            dracoObject = new dracoEncoder.Mesh();

            var vertices = geometry.getAttribute('position');
            builder.AddFloatAttributeToMesh(dracoObject, dracoEncoder.POSITION, vertices.count, vertices.itemSize, vertices.array);

            var faces = geometry.getIndex();

            if (faces !== null) {

                builder.AddFacesToMesh(dracoObject, faces.count / 3, faces.array);

            } else {

                var faces = new (vertices.count > 65535 ? Uint32Array : Uint16Array)(vertices.count);

                for (var i = 0; i < faces.length; i++) {

                    faces[i] = i;

                }

                builder.AddFacesToMesh(dracoObject, vertices.count, faces);

            }

            if (options.exportNormals === true) {

                var normals = geometry.getAttribute('normal');

                if (normals !== undefined) {

                    builder.AddFloatAttributeToMesh(dracoObject, dracoEncoder.NORMAL, normals.count, normals.itemSize, normals.array);

                }

            }

            if (options.exportUvs === true) {

                var uvs = geometry.getAttribute('uv');

                if (uvs !== undefined) {

                    builder.AddFloatAttributeToMesh(dracoObject, dracoEncoder.TEX_COORD, uvs.count, uvs.itemSize, uvs.array);

                }

            }

            if (options.exportColor === true) {

                var colors = geometry.getAttribute('color');

                if (colors !== undefined) {

                    builder.AddFloatAttributeToMesh(dracoObject, dracoEncoder.COLOR, colors.count, colors.itemSize, colors.array);

                }

            }

        } else if (object.isPoints === true) {

            builder = new dracoEncoder.PointCloudBuilder();
            dracoObject = new dracoEncoder.PointCloud();

            var vertices = geometry.getAttribute('position');
            builder.AddFloatAttribute(dracoObject, dracoEncoder.POSITION, vertices.count, vertices.itemSize, vertices.array);

            if (options.exportColor === true) {

                var colors = geometry.getAttribute('color');

                if (colors !== undefined) {

                    builder.AddFloatAttribute(dracoObject, dracoEncoder.COLOR, colors.count, colors.itemSize, colors.array);

                }

            }

        } else {

            throw new Error('DRACOExporter: Unsupported object type.');

        }

        //Compress using draco encoder

        var encodedData = new dracoEncoder.DracoInt8Array();

        //Sets the desired encoding and decoding speed for the given options from 0 (slowest speed, but the best compression) to 10 (fastest, but the worst compression).

        var encodeSpeed = (options.encodeSpeed !== undefined) ? options.encodeSpeed : 5;
        var decodeSpeed = (options.decodeSpeed !== undefined) ? options.decodeSpeed : 5;

        encoder.SetSpeedOptions(encodeSpeed, decodeSpeed);

        // Sets the desired encoding method for a given geometry.

        if (options.encoderMethod !== undefined) {

            encoder.SetEncodingMethod(options.encoderMethod);

        }

        // Sets the quantization (number of bits used to represent) compression options for a named attribute.
        // The attribute values will be quantized in a box defined by the maximum extent of the attribute values.
        if (options.quantization !== undefined) {

            for (var i = 0; i < 5; i++) {

                if (options.quantization[i] !== undefined) {

                    encoder.SetAttributeQuantization(i, options.quantization[i]);

                }

            }

        }

        var length;

        if (object.isMesh === true) {

            length = encoder.EncodeMeshToDracoBuffer(dracoObject, encodedData);

        } else {

            length = encoder.EncodePointCloudToDracoBuffer(dracoObject, true, encodedData);

        }

        dracoEncoder.destroy(dracoObject);

        if (length === 0) {

            throw new Error('v3d.DRACOExporter: Draco encoding failed.');

        }

        //Copy encoded data to buffer.
        var outputData = new Int8Array(new ArrayBuffer(length));

        for (var i = 0; i < length; i++) {

            outputData[i] = encodedData.GetValue(i);

        }

        dracoEncoder.destroy(encodedData);
        dracoEncoder.destroy(encoder);
        dracoEncoder.destroy(builder);

        return outputData;

    }

};

// Encoder methods

v3d.DRACOExporter.MESH_EDGEBREAKER_ENCODING = 1;
v3d.DRACOExporter.MESH_SEQUENTIAL_ENCODING = 0;

// Geometry type

v3d.DRACOExporter.POINT_CLOUD = 0;
v3d.DRACOExporter.TRIANGULAR_MESH = 1;

// Attribute type

v3d.DRACOExporter.INVALID = - 1;
v3d.DRACOExporter.POSITION = 0;
v3d.DRACOExporter.NORMAL = 1;
v3d.DRACOExporter.COLOR = 2;
v3d.DRACOExporter.TEX_COORD = 3;
v3d.DRACOExporter.GENERIC = 4;
