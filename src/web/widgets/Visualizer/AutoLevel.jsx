import * as THREE from 'three';

const Toolpath = require('gcode-toolpath');

class AutoLevel {
    group = new THREE.Object3D();

    color = new THREE.Color(0x440000);
    config = null;
    points = [];
    segments = [];

    constructor(config) {
        config.ey = Math.floor((config.ey - config.sy) / config.dy) * config.dy;
        config.ex = Math.floor((config.ex - config.sx) / config.dx) * config.dx;
        this.config = config;
        var x, y;
        for (y = config.sy; y <= config.ey; y += config.dy) {
            for (x = config.sx; x <= config.ex; x += config.dx) {
                this.points.push({ x: x, y: y });
            }
        }
    }
    addLine(x1, y1, x2, y2) {
        const geometry = new THREE.Geometry();
        const material = new THREE.LineBasicMaterial({
            vertexColors: THREE.VertexColors
        });

        var z1, z2;
        var target1 = this.points.filter(p => p.x === x1 && p.y === y1);
        if (target1 && target1.length === 1) {
            z1 = target1[0].z;
        } else {
            return false;
        }
        var target2 = this.points.filter(p => p.x === x2 && p.y === y2);
        if (target2 && target2.length === 1) {
            z2 = target2[0].z;
        } else {
            return false;
        }
        geometry.vertices.push(
            new THREE.Vector3(x1, y1, z1),
            new THREE.Vector3(x2, y2, z2),
        );
        this.segments.push({ s: { x: x1, y: y1, z: z1 }, e: { x: x2, y: y2, z: z2 } });
        geometry.colors.push(this.color, this.color);

        this.group.add(new THREE.Line(geometry, material));
        return true;
    }
    finish() {
        console.log(this.points);
        var x, y;
        var config = this.config;
        for (y = config.sy; y < config.ey; y += config.dy) {
            for (x = config.sx; x < config.ex; x += config.dx) {
                this.addLine(x, y, x + config.dx, y + config.dy);
                this.addLine(x, y, x, y + config.dy);
                this.addLine(x, y, x + config.dx, y);
            }
        }
        for (x = config.sx; x < config.ex; x += config.dx) {
            this.addLine(x, config.ey, x + config.dx, config.ey);
        }
        for (y = config.sy; y < config.ey; y += config.dy) {
            this.addLine(config.ex, y, config.ex, y + config.dy);
        }
    }
    update(point) {
        var target = this.points.filter(p => p.x === point.x && p.y === point.y);
        if (target && target.length === 1) {
            target[0].z = point.z;
        } else {
            throw Error('Internal error finding point.');
        }
    }
    getGeometry() {
        return this.group;
    }
    lineParameter(p1, p2) {
        return { a: p1.y - p2.y, b: p2.x - p1.x, c: p1.x * p2.y - p1.y * p2.x };
    }
    segmentsIntr(a, b, c, d) {
        var lp1 = this.lineParameter(a, b);
        var lp2 = this.lineParameter(c, d);
        var D = lp1.a * lp2.b - lp2.a * lp1.b;
        if (D === 0) {
            return false;
        }
        return { x: (lp1.b * lp2.c - lp2.b * lp1.c) / D, y: (lp1.c * lp2.a - lp2.c * lp1.a) / D };
    }
    zOfLine(p1, p2, p) {
        if (p1.x === p2.x && p1.y === p2.y) {
            if (p2.x === p.x && p2.y === p.y) {
                return p2.z;
            } else {
                throw Error('Fail to get z of p');
            }
        }
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var dz = p2.z - p1.z;
        var dxx = p.x - p1.x;
        var dxy = p.y - p1.y;
        var lineLen = Math.sqrt(dx * dx + dy * dy);
        var lineXLen = Math.sqrt(dxx * dxx + dxy * dxy);
        var z = dz * lineXLen / lineLen + p1.z;
        return z;
    }
    zOfPoint(p1) {
        var p2 = { x: p1.x, y: p1.y + 1 };
        var xP1 = null;
        var xP2 = null;
        for (var segment of this.segments) {
            var xPoint = this.segmentsIntr(segment.s, segment.e, p1, p2);
            if (xPoint) {
                if (xPoint.x < segment.s.x || xPoint.x > segment.e.x) {
                    continue;
                }
                xPoint.z = this.zOfLine(segment.s, segment.e, xPoint);
                if (xPoint.y === p1.y) {
                    return p1.z + this.zOfLine(segment.s, segment.e, p1);
                } else if (xPoint.y < p1.y && (xP1 === null || xPoint.y > xP1.y)) {
                    xP1 = xPoint;
                } else if (xPoint.y > p1.y && (xP2 === null || xPoint.y < xP2.y)) {
                    xP2 = xPoint;
                }
            }
        }
        if (xP1 !== null && xP2 !== null) {
            return p1.z + this.zOfLine(xP1, xP2, p1);
        }
        throw Error('Could not get z');
    }
    modifyGCode(gcode) {
        var newLine = false;
        var motion = 'G0';
        var lineStart;
        var lineEnd;
        var newArcCurve = false;
        var modifiedGCode = '';
        var z;
        var toolpath = new Toolpath({
            position: { x: 0, y: 0, z: 0 },
            modal: {
                motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
                wcs: 'G54', // G54, G55, G56, G57, G58, G59
                plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
                units: 'G21', // G20: Inches, G21: Millimeters
                distance: 'G90', // G90: Absolute, G91: Relative
                feedrate: 'G94', // G93: Inverse time mode, G94: Units per minute, G95: Units per rev
                program: 'M0', // M0, M1, M2, M30
                spindle: 'M5', // M3, M4, M5
                coolant: 'M9', // M7, M8, M9
                tool: 0
            },
            addLine: (modal, v1, v2) => {
                newLine = true;
                motion = modal.motion;
                lineStart = v1;
                lineEnd = v2;
            },
            addArcCurve: (modal, v1, v2, v0) => {
                newArcCurve = true;
            }
        });
        var orderXPoints = function (a, b) {
            if (lineStart.x < lineEnd.x) {
                return a.x < b.x ? -1 : 1;
            } else {
                return a.x > b.x ? 1 : -1;
            }
        };
        for (var line of gcode.split('\n')) {
            newLine = false;
            newArcCurve = false;
            var results = toolpath.loadFromStringSync(line);
            if (results.length > 1) {
                throw Error('Multiple motion in one line is not supported.');
            } else if (results.length === 0) {
                // No result, append original line
                modifiedGCode = modifiedGCode + '\n' + line;
            } else {
                var result = results[0];
                if (newLine) {
                    if (lineStart.x < this.config.sx ||
                        lineStart.x > this.config.ex ||
                        lineStart.y < this.config.sy ||
                        lineStart.y > this.config.ey ||
                        lineEnd.x < this.config.sx ||
                        lineEnd.x > this.config.ex ||
                        lineEnd.y < this.config.sy ||
                        lineEnd.y > this.config.ey) {
                        throw Error('Model outside of auto level range');
                    }
                    var extra = '';
                    for (var word of result.words) {
                        if (!['G', 'X', 'Y', 'Z'].includes(word[0])) {
                            extra = extra + word[0] + word[1] + ' ';
                        }
                    }
                    if (lineStart.x === lineEnd.x && lineStart.y === lineEnd.y) {
                        z = this.zOfPoint(lineEnd);
                        newCmd = motion + ' X' + lineEnd.x.toFixed(3) + ' Y' + lineEnd.y.toFixed(3) + ' Z' + z.toFixed(3) + ' ' + extra;
                        modifiedGCode = modifiedGCode + '\n' + newCmd;
                        continue;
                    }
                    var xPoints = [];
                    var xPoint;
                    var minX = Math.min(lineStart.x, lineEnd.x);
                    var maxX = Math.max(lineStart.x, lineEnd.x);
                    var minY = Math.min(lineStart.y, lineEnd.y);
                    var maxY = Math.max(lineStart.y, lineEnd.y);
                    var segment;
                    for (segment of this.segments) {
                        xPoint = this.segmentsIntr(segment.s, segment.e, lineStart, lineEnd);
                        if (xPoint &&
                            xPoint.x >= minX && xPoint.x <= maxX &&
                            xPoint.y >= minY && xPoint.y <= maxY &&
                            (xPoint.x !== lineStart.x && xPoint.y !== lineStart.y) &&
                            xPoint.x >= segment.s.x && xPoint.x <= segment.e.x &&
                            xPoint.y >= segment.s.y && xPoint.y <= segment.e.y) {
                            var zAutoLevel = this.zOfLine(segment.s, segment.e, xPoint);
                            var zGCode = this.zOfLine(lineStart, lineEnd, xPoint);
                            xPoint.z = zGCode + zAutoLevel;
                            xPoints.push(xPoint);
                        }
                    }
                    xPoints.sort(orderXPoints);
                    var newCmd = null;
                    if (xPoints.length === 0) {
                        z = this.zOfPoint(lineEnd);
                        newCmd = motion + ' X' + lineEnd.x.toFixed(3) + ' Y' + lineEnd.y.toFixed(3) + ' Z' + z.toFixed(3) + ' ' + extra;
                        modifiedGCode = modifiedGCode + '\n' + newCmd;
                    } else {
                        var lineEndAdded = false;
                        var lastPoint = null;
                        for (var p of xPoints) {
                            if (lastPoint !== null && lastPoint.x === p.x && lastPoint.y === p.y) {
                                continue;
                            }
                            newCmd = motion + ' X' + p.x.toFixed(3) + ' Y' + p.y.toFixed(3) + ' Z' + p.z.toFixed(3) + ' ' + extra;
                            modifiedGCode = modifiedGCode + '\n' + newCmd;
                            if (p.x === lineEnd.x && p.x === lineEnd.y) {
                                lineEndAdded = true;
                            }
                            lastPoint = p;
                        }
                        if (!lineEndAdded) {
                            z = this.zOfPoint(lineEnd);
                            newCmd = motion + ' X' + lineEnd.x.toFixed(3) + ' Y' + lineEnd.y.toFixed(3) + ' Z' + z.toFixed(3) + ' ' + extra;
                            modifiedGCode = modifiedGCode + '\n' + newCmd;
                        }
                    }
                } else if (newArcCurve) {
                    throw Error('G2/G3 arc is not supported.');
                } else {
                    // No new line no arc, add original line
                    modifiedGCode = modifiedGCode + '\n' + line;
                }
            }
        }
        console.log(modifiedGCode);
        return modifiedGCode;
    }
}

export default AutoLevel;
