/**
 * @author sunag / http://www.sunag.com.br/
 */

v3d.FloatNode = function(value) {

    v3d.InputNode.call(this, 'fv1');

    this.value = [value || 0];

};

v3d.FloatNode.prototype = Object.create(v3d.InputNode.prototype);
v3d.FloatNode.prototype.constructor = v3d.FloatNode;

Object.defineProperties(v3d.FloatNode.prototype, {
    number: {
        get: function() {

            return this.value[0];

        },
        set: function(val) {

            this.value[0] = val;

        }
    }
});
