/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.BlurNode = function(value, coord, radius, size) {

    v3d.TempNode.call(this, 'v4');

    this.requestUpdate = true;

    this.value = value;
    this.coord = coord || new v3d.UVNode();
    this.radius = new v3d.Vector2Node(1, 1);
    this.size = size;

    this.blurX = true;
    this.blurY = true;

    this.horizontal = new v3d.FloatNode(1 / 64);
    this.vertical = new v3d.FloatNode(1 / 64);

};

v3d.BlurNode.fBlurX = new v3d.FunctionNode([
"vec4 blurX(sampler2D texture, vec2 uv, float s) {",
"    vec4 sum = vec4(0.0);",
"    sum += texture2D(texture, vec2(uv.x - 4.0 * s, uv.y)) * 0.051;",
"    sum += texture2D(texture, vec2(uv.x - 3.0 * s, uv.y)) * 0.0918;",
"    sum += texture2D(texture, vec2(uv.x - 2.0 * s, uv.y)) * 0.12245;",
"    sum += texture2D(texture, vec2(uv.x - 1.0 * s, uv.y)) * 0.1531;",
"    sum += texture2D(texture, vec2(uv.x, uv.y)) * 0.1633;",
"    sum += texture2D(texture, vec2(uv.x + 1.0 * s, uv.y)) * 0.1531;",
"    sum += texture2D(texture, vec2(uv.x + 2.0 * s, uv.y)) * 0.12245;",
"    sum += texture2D(texture, vec2(uv.x + 3.0 * s, uv.y)) * 0.0918;",
"    sum += texture2D(texture, vec2(uv.x + 4.0 * s, uv.y)) * 0.051;",
"    return sum;",
"}"
].join("\n"));

v3d.BlurNode.fBlurY = new v3d.FunctionNode([
"vec4 blurY(sampler2D texture, vec2 uv, float s) {",
"    vec4 sum = vec4(0.0);",
"    sum += texture2D(texture, vec2(uv.x, uv.y - 4.0 * s)) * 0.051;",
"    sum += texture2D(texture, vec2(uv.x, uv.y - 3.0 * s)) * 0.0918;",
"    sum += texture2D(texture, vec2(uv.x, uv.y - 2.0 * s)) * 0.12245;",
"    sum += texture2D(texture, vec2(uv.x, uv.y - 1.0 * s)) * 0.1531;",
"    sum += texture2D(texture, vec2(uv.x, uv.y)) * 0.1633;",
"    sum += texture2D(texture, vec2(uv.x, uv.y + 1.0 * s)) * 0.1531;",
"    sum += texture2D(texture, vec2(uv.x, uv.y + 2.0 * s)) * 0.12245;",
"    sum += texture2D(texture, vec2(uv.x, uv.y + 3.0 * s)) * 0.0918;",
"    sum += texture2D(texture, vec2(uv.x, uv.y + 4.0 * s)) * 0.051;",
"    return sum;",
"}"
].join("\n"));

v3d.BlurNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.BlurNode.prototype.constructor = v3d.BlurNode;

v3d.BlurNode.prototype.updateFrame = function(delta) {

    if (this.size) {

        this.horizontal.number = this.radius.x / this.size.x;
        this.vertical.number = this.radius.y / this.size.y;

    } else if (this.value.value && this.value.value.image) {

        var image = this.value.value.image;

        this.horizontal.number = this.radius.x / image.width;
        this.vertical.number = this.radius.y / image.height;

    }

};

v3d.BlurNode.prototype.generate = function(builder, output) {

    var material = builder.material, blurX = v3d.BlurNode.fBlurX, blurY = v3d.BlurNode.fBlurY;

    builder.include(blurX);
    builder.include(blurY);

    if (builder.isShader('fragment')) {

        var blurCode = [], code;

        if (this.blurX) {

            blurCode.push(blurX.name + '(' + this.value.build(builder, 'sampler2D') + ',' + this.coord.build(builder, 'v2') + ',' + this.horizontal.build(builder, 'fv1') + ')');

        }

        if (this.blurY) {

            blurCode.push(blurY.name + '(' + this.value.build(builder, 'sampler2D') + ',' + this.coord.build(builder, 'v2') + ',' + this.vertical.build(builder, 'fv1') + ')');

        }

        if (blurCode.length == 2) code = '(' + blurCode.join('+') + '/2.0)';
        else if (blurCode.length) code = '(' + blurCode[0] + ')';
        else code = 'vec4(0.0)';

        return builder.format(code, this.getType(builder), output);

    } else {

        console.warn("v3d.BlurNode is not compatible with " + builder.shader + " shader.");

        return builder.format('vec4(0.0)', this.getType(builder), output);

    }

};
