/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.RawNode = function(value) {

    v3d.GLNode.call(this, 'v4');

    this.value = value;

};

v3d.RawNode.prototype = Object.create(v3d.GLNode.prototype);
v3d.RawNode.prototype.constructor = v3d.RawNode;

v3d.GLNode.prototype.generate = function(builder) {

    var material = builder.material;

    var data = this.value.parseAndBuildCode(builder, this.type);

    var code = data.code + '\n';

    if (builder.shader == 'vertex') {

        code += 'gl_Position = ' + data.result + ';';

    } else {

        code += 'gl_FragColor = ' + data.result + ';';

    }

    return code;

};
