/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.IntNode = function(value) {

    v3d.InputNode.call(this, 'iv1');

    this.value = [Math.floor(value || 0)];

};

v3d.IntNode.prototype = Object.create(v3d.InputNode.prototype);
v3d.IntNode.prototype.constructor = v3d.IntNode;

Object.defineProperties(v3d.IntNode.prototype, {
    number: {
        get: function() {

            return this.value[0];

        },
        set: function(val) {

            this.value[0] = Math.floor(val);

        }
    }
});
