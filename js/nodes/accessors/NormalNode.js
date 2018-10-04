/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.NormalNode = function(scope) {

    v3d.TempNode.call(this, 'v3');

    this.scope = scope || v3d.NormalNode.LOCAL;

};

v3d.NormalNode.LOCAL = 'local';
v3d.NormalNode.WORLD = 'world';
v3d.NormalNode.VIEW = 'view';

v3d.NormalNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.NormalNode.prototype.constructor = v3d.NormalNode;

v3d.NormalNode.prototype.isShared = function(builder) {

    switch (this.scope) {
        case v3d.NormalNode.WORLD:
            return true;
    }

    return false;

};

v3d.NormalNode.prototype.generate = function(builder, output) {

    var material = builder.material;
    var result;

    switch (this.scope) {

        case v3d.NormalNode.LOCAL:

            material.requestAttribs.normal = true;

            if (builder.isShader('vertex')) result = 'normal';
            else result = 'vObjectNormal';

            break;

        case v3d.NormalNode.WORLD:

            material.requestAttribs.worldNormal = true;

            if (builder.isShader('vertex')) result = '(modelMatrix * vec4(objectNormal, 0.0)).xyz';
            else result = 'vWNormal';

            break;

        case v3d.NormalNode.VIEW:

            result = 'vNormal';

            break;

    }

    return builder.format(result, this.getType(builder), output);

};
