/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.ColorAdjustmentNode = function(rgb, adjustment, method) {

    v3d.TempNode.call(this, 'v3');

    this.rgb = rgb;
    this.adjustment = adjustment;

    this.method = method || v3d.ColorAdjustmentNode.SATURATION;

};

v3d.ColorAdjustmentNode.SATURATION = 'saturation';
v3d.ColorAdjustmentNode.HUE = 'hue';
v3d.ColorAdjustmentNode.VIBRANCE = 'vibrance';
v3d.ColorAdjustmentNode.BRIGHTNESS = 'brightness';
v3d.ColorAdjustmentNode.CONTRAST = 'contrast';

v3d.ColorAdjustmentNode.prototype = Object.create(v3d.TempNode.prototype);
v3d.ColorAdjustmentNode.prototype.constructor = v3d.ColorAdjustmentNode;

v3d.ColorAdjustmentNode.prototype.generate = function(builder, output) {

    var rgb = this.rgb.build(builder, 'v3');
    var adjustment = this.adjustment.build(builder, 'fv1');

    var name;

    switch (this.method) {

        case v3d.ColorAdjustmentNode.SATURATION:

            name = 'saturation_rgb';

            break;

        case v3d.ColorAdjustmentNode.HUE:

            name = 'hue_rgb';

            break;

        case v3d.ColorAdjustmentNode.VIBRANCE:

            name = 'vibrance_rgb';

            break;

        case v3d.ColorAdjustmentNode.BRIGHTNESS:

            return builder.format('(' + rgb + '+' + adjustment + ')', this.getType(builder), output);

            break;

        case v3d.ColorAdjustmentNode.CONTRAST:

            return builder.format('(' + rgb + '*' + adjustment + ')', this.getType(builder), output);

            break;

    }

    builder.include(name);

    return builder.format(name + '(' + rgb + ',' + adjustment + ')', this.getType(builder), output);

};
