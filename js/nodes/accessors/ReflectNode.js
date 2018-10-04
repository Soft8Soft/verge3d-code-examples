/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ReflectNode = function(scope) {

    v3d.TempNode.call(this, 'v3', { unique: true });

    this.scope = scope || v3d.ReflectNode.CUBE;

};

v3d.ReflectNode.CUBE = 'cube';
v3d.ReflectNode.SPHERE = 'sphere';
v3d.ReflectNode.VECTOR = 'vector';

v3d.ReflectNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.ReflectNode.prototype.constructor = v3d.ReflectNode;

v3d.ReflectNode.prototype.getType = function(builder) {

    switch (this.scope) {
        case v3d.ReflectNode.SPHERE:
            return 'v2';
    }

    return this.type;

};

v3d.ReflectNode.prototype.generate = function(builder, output) {

    var result;

    switch (this.scope) {

        case v3d.ReflectNode.VECTOR:

            builder.material.addFragmentNode('vec3 reflectVec = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);');

            result = 'reflectVec';

            break;

        case v3d.ReflectNode.CUBE:

            var reflectVec = new v3d.ReflectNode(v3d.ReflectNode.VECTOR).build(builder, 'v3');

            builder.material.addFragmentNode('vec3 reflectCubeVec = vec3(-1.0 * ' + reflectVec + '.x, ' + reflectVec + '.yz);');

            result = 'reflectCubeVec';

            break;

        case v3d.ReflectNode.SPHERE:

            var reflectVec = new v3d.ReflectNode(v3d.ReflectNode.VECTOR).build(builder, 'v3');

            builder.material.addFragmentNode('vec2 reflectSphereVec = normalize((viewMatrix * vec4(' + reflectVec + ', 0.0)).xyz + vec3(0.0,0.0,1.0)).xy * 0.5 + 0.5;');

            result = 'reflectSphereVec';

            break;
    }

    return builder.format(result, this.getType(this.type), output);

};
