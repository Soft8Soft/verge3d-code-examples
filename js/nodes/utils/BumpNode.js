/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.BumpNode = function(value, coord, scale) {

    v3d.TempNode.call(this, 'v3');

    this.value = value;
    this.coord = coord || new v3d.UVNode();
    this.scale = scale || new v3d.Vector2Node(1, 1);

};

v3d.BumpNode.fBumpToNormal = new v3d.FunctionNode([
"vec3 bumpToNormal(sampler2D bumpMap, vec2 uv, vec2 scale) {",
"    vec2 dSTdx = dFdx(uv);",
"    vec2 dSTdy = dFdy(uv);",
"    float Hll = texture2D(bumpMap, uv).x;",
"    float dBx = texture2D(bumpMap, uv + dSTdx).x - Hll;",
"    float dBy = texture2D(bumpMap, uv + dSTdy).x - Hll;",
"    return vec3(.5 + (dBx * scale.x), .5 + (dBy * scale.y), 1.0);",
"}"
].join("\n"), null, { derivatives: true });

v3d.BumpNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.BumpNode.prototype.constructor = v3d.BumpNode;

v3d.BumpNode.prototype.generate = function(builder, output) {

    var material = builder.material, func = v3d.BumpNode.fBumpToNormal;

    builder.include(func);

    if (builder.isShader('fragment')) {

        return builder.format(func.name + '(' + this.value.build(builder, 'sampler2D') + ',' +
            this.coord.build(builder, 'v2') + ',' +
            this.scale.build(builder, 'v2') + ')', this.getType(builder), output);

    } else {

        console.warn("v3d.BumpNode is not compatible with " + builder.shader + " shader.");

        return builder.format('vec3(0.0)', this.getType(builder), output);

    }

};
