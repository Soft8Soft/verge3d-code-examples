/**
 * @author WestLangley / http://github.com/WestLangley
 *
 */

v3d.Wireframe = function(geometry, material) {

    v3d.Mesh.call(this);

    this.type = 'Wireframe';

    this.geometry = geometry !== undefined ? geometry : new v3d.LineSegmentsGeometry();
    this.material = material !== undefined ? material : new v3d.LineMaterial({ color: Math.random() * 0xffffff });

};

v3d.Wireframe.prototype = Object.assign(Object.create(v3d.Mesh.prototype), {

    constructor: v3d.Wireframe,

    isWireframe: true,

    computeLineDistances: (function() { // for backwards-compatability, but could be a method of LineSegmentsGeometry...

        var start = new v3d.Vector3();
        var end = new v3d.Vector3();

        return function computeLineDistances() {

            var geometry = this.geometry;

            var instanceStart = geometry.attributes.instanceStart;
            var instanceEnd = geometry.attributes.instanceEnd;
            var lineDistances = new Float32Array(2 * instanceStart.data.count);

            for (var i = 0, j = 0, l = instanceStart.data.count; i < l; i++, j += 2) {

                start.fromBufferAttribute(instanceStart, i);
                end.fromBufferAttribute(instanceEnd, i);

                lineDistances[j] = (j === 0) ? 0 : lineDistances[j - 1];
                lineDistances[j + 1] = lineDistances[j] + start.distanceTo(end);

            }

            var instanceDistanceBuffer = new v3d.InstancedInterleavedBuffer(lineDistances, 2, 1); // d0, d1

            geometry.setAttribute('instanceDistanceStart', new v3d.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 0)); // d0
            geometry.setAttribute('instanceDistanceEnd', new v3d.InterleavedBufferAttribute(instanceDistanceBuffer, 1, 1)); // d1

            return this;

        };

    }())

});
