/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.InputNode = function(type, params) {

    params = params || {};
    params.shared = params.shared !== undefined ? params.shared : false;

    v3d.TempNode.call(this, type, params);

};

v3d.InputNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.InputNode.prototype.constructor = v3d.InputNode;

v3d.InputNode.prototype.generate = function(builder, output, uuid, type, ns, needsUpdate) {

    var material = builder.material;

    uuid = builder.getUuid(uuid || this.getUuid());
    type = type || this.getType(builder);

    var data = material.getDataNode(uuid);

    if (builder.isShader('vertex')) {

        if (! data.vertex) {

            data.vertex = material.createVertexUniform(type, this.value, ns, needsUpdate);

        }

        return builder.format(data.vertex.name, type, output);

    } else {

        if (! data.fragment) {

            data.fragment = material.createFragmentUniform(type, this.value, ns, needsUpdate);

        }

        return builder.format(data.fragment.name, type, output);

    }

};
