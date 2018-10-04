/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Math1Node = function(a, method) {

    v3d.TempNode.call(this);

    this.a = a;

    this.method = method || v3d.Math1Node.SIN;

};

v3d.Math1Node.RAD = 'radians';
v3d.Math1Node.DEG = 'degrees';
v3d.Math1Node.EXP = 'exp';
v3d.Math1Node.EXP2 = 'exp2';
v3d.Math1Node.LOG = 'log';
v3d.Math1Node.LOG2 = 'log2';
v3d.Math1Node.SQRT = 'sqrt';
v3d.Math1Node.INV_SQRT = 'inversesqrt';
v3d.Math1Node.FLOOR = 'floor';
v3d.Math1Node.CEIL = 'ceil';
v3d.Math1Node.NORMALIZE = 'normalize';
v3d.Math1Node.FRACT = 'fract';
v3d.Math1Node.SAT = 'saturate';
v3d.Math1Node.SIN = 'sin';
v3d.Math1Node.COS = 'cos';
v3d.Math1Node.TAN = 'tan';
v3d.Math1Node.ASIN = 'asin';
v3d.Math1Node.ACOS = 'acos';
v3d.Math1Node.ARCTAN = 'atan';
v3d.Math1Node.ABS = 'abs';
v3d.Math1Node.SIGN = 'sign';
v3d.Math1Node.LENGTH = 'length';
v3d.Math1Node.NEGATE = 'negate';
v3d.Math1Node.INVERT = 'invert';

v3d.Math1Node.prototype = Object.create(v3d.TempNode.prototype);
v3d.Math1Node.prototype.constructor = v3d.Math1Node;

v3d.Math1Node.prototype.getType = function(builder) {

    switch (this.method) {
        case v3d.Math1Node.LENGTH:
            return 'fv1';
    }

    return this.a.getType(builder);

};

v3d.Math1Node.prototype.generate = function(builder, output) {

    var material = builder.material;

    var type = this.getType(builder);

    var result = this.a.build(builder, type);

    switch (this.method) {

        case v3d.Math1Node.NEGATE:
            result = '(-' + result + ')';
            break;

        case v3d.Math1Node.INVERT:
            result = '(1.0-' + result + ')';
            break;

        default:
            result = this.method + '(' + result + ')';
            break;
    }

    return builder.format(result, type, output);

};
