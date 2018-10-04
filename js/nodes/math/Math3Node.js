/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.Math3Node = function(a, b, c, method) {

    v3d.TempNode.call(this);

    this.a = a;
    this.b = b;
    this.c = c;

    this.method = method || v3d.Math3Node.MIX;

};

v3d.Math3Node.MIX = 'mix';
v3d.Math3Node.REFRACT = 'refract';
v3d.Math3Node.SMOOTHSTEP = 'smoothstep';
v3d.Math3Node.FACEFORWARD = 'faceforward';

v3d.Math3Node.prototype = Object.create(v3d.TempNode.prototype);
v3d.Math3Node.prototype.constructor = v3d.Math3Node;

v3d.Math3Node.prototype.getType = function(builder) {

    var a = builder.getFormatLength(this.a.getType(builder));
    var b = builder.getFormatLength(this.b.getType(builder));
    var c = builder.getFormatLength(this.c.getType(builder));

    if (a > b && a > c) return this.a.getType(builder);
    else if (b > c) return this.b.getType(builder);

    return this.c.getType(builder);

};

v3d.Math3Node.prototype.generate = function(builder, output) {

    var material = builder.material;

    var type = this.getType(builder);

    var a, b, c,
        al = builder.getFormatLength(this.a.getType(builder)),
        bl = builder.getFormatLength(this.b.getType(builder)),
        cl = builder.getFormatLength(this.c.getType(builder));

    // optimzer

    switch (this.method) {
        case v3d.Math3Node.REFRACT:
            a = this.a.build(builder, type);
            b = this.b.build(builder, type);
            c = this.c.build(builder, 'fv1');
            break;

        case v3d.Math3Node.MIX:
            a = this.a.build(builder, type);
            b = this.b.build(builder, type);
            c = this.c.build(builder, cl == 1 ? 'fv1' : type);
            break;

        default:
            a = this.a.build(builder, type);
            b = this.b.build(builder, type);
            c = this.c.build(builder, type);
            break;

    }

    return builder.format(this.method + '(' + a + ',' + b + ',' + c + ')', type, output);

};
