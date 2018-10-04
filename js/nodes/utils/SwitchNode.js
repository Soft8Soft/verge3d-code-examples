/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.SwitchNode = function(node, components) {

    v3d.GLNode.call(this);

    this.node = node;
    this.components = components || 'x';

};

v3d.SwitchNode.prototype = Object.create(v3d.GLNode.prototype);
v3d.SwitchNode.prototype.constructor = v3d.SwitchNode;

v3d.SwitchNode.prototype.getType = function(builder) {

    return builder.getFormatFromLength(this.components.length);

};

v3d.SwitchNode.prototype.generate = function(builder, output) {

    var type = this.node.getType(builder);
    var inputLength = builder.getFormatLength(type) - 1;

    var node = this.node.build(builder, type);

    if (inputLength > 0) {

        // get max length

        var outputLength = 0;
        var components = builder.colorToVector(this.components);

        var i, len = components.length;

        for (i = 0; i < len; i++) {

            outputLength = Math.max(outputLength, builder.getIndexByElement(components.charAt(i)));

        }

        if (outputLength > inputLength) outputLength = inputLength;

        // split

        node += '.';

        for (i = 0; i < len; i++) {

            var elm = components.charAt(i);
            var idx = builder.getIndexByElement(components.charAt(i));

            if (idx > outputLength) idx = outputLength;

            node += builder.getElementByIndex(idx);

        }

        return builder.format(node, this.getType(builder), output);

    } else {

        // join

        return builder.format(node, type, output)

    }

};
