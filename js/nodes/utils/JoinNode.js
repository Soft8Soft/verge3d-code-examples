/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.JoinNode = function(x, y, z, w) {

    v3d.TempNode.call(this, 'fv1');

    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;

};

v3d.JoinNode.inputs = ['x', 'y', 'z', 'w'];

v3d.JoinNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.JoinNode.prototype.constructor = v3d.JoinNode;

v3d.JoinNode.prototype.getNumElements = function() {

    var inputs = v3d.JoinNode.inputs;
    var i = inputs.length;

    while (i --) {

        if (this[inputs[i]] !== undefined) {

            ++ i;
            break;

        }

    }

    return Math.max(i, 2);

};

v3d.JoinNode.prototype.getType = function(builder) {

    return builder.getFormatFromLength(this.getNumElements());

};

v3d.JoinNode.prototype.generate = function(builder, output) {

    var material = builder.material;

    var type = this.getType(builder);
    var length = this.getNumElements();

    var inputs = v3d.JoinNode.inputs;
    var outputs = [];

    for (var i = 0; i < length; i++) {

        var elm = this[inputs[i]];

        outputs.push(elm ? elm.build(builder, 'fv1') : '0.');

    }

    var code = (length > 1 ? builder.getConstructorFromLength(length) : '') + '(' + outputs.join(',') + ')';

    return builder.format(code, type, output);

};
