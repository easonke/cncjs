import classNames from 'classnames';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import Widget from '../../components/Widget';
import controller from '../../lib/controller';
import WidgetConfig from '../WidgetConfig';
import i18n from '../../lib/i18n';
import Space from '../../components/Space';
import styles from './index.styl';
import {
    METRIC_UNITS
} from '../../constants';

class AutoLevelWidget extends PureComponent {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onRemove: PropTypes.func.isRequired,
    };

    config = new WidgetConfig(this.props.widgetId);
    state = this.getInitialState();
    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            units: METRIC_UNITS,
            sx: 0,
            sy: 0,
            dx: 0,
            dy: 0,
            ex: 0,
            ey: 0,
            probeDepth: 0,
            probeFeedrate: 0,
            touchPlateHeight: 0,
            retractionDistance: 0,
            workPosition: { // Work position
                x: '0.000',
                y: '0.000',
                z: '0.000',
                a: '0.000',
                b: '0.000',
                c: '0.000'
            },
            points: {},
            currentPoint: null
        };
    }
    render() {
        const { minimized } = this.state;
        const actions = {
            ...this.actions
        };
        const {
            units,
            sx,
            sy,
            dx,
            dy,
            ex,
            ey,
            probeDepth,
            probeFeedrate,
            touchPlateHeight,
            retractionDistance
        } = this.state;
        const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
        const feedrateUnits = (units === METRIC_UNITS) ? i18n._('mm/min') : i18n._('in/min');
        const step = (units === METRIC_UNITS) ? 1 : 0.1;
        return (
            <Widget>
                <Widget.Header>
                    <Widget.Title>AutoLevel</Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.DropdownButton
                            title={i18n._('More')}
                            toggle={<i className="fa fa-ellipsis-v" />}
                            onSelect={(eventKey) => {
                                if (eventKey === 'remove') {
                                    this.props.onRemove();
                                }
                            }}
                        >
                            <Widget.DropdownMenuItem eventKey="remove">
                                <i className="fa fa-fw fa-times" />
                                <Space width="4" />
                                {i18n._('Remove Widget')}
                            </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    <div className="row no-gutters">
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Start X')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={sx}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleSXChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Start Y')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={sy}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleSYChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('End X')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={ex}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleEXChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('End Y')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={ey}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleEYChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Delta X')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={dx}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleDXChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Delta Y')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={dy}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleDYChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Probe Depth')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={probeDepth}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleProbeDepthChange}
                                    />
                                    <div className="input-group-addon">{displayUnits}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingLeft: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Probe Feedrate')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={probeFeedrate}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleProbeFeedrateChange}
                                    />
                                    <span className="input-group-addon">{feedrateUnits}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingRight: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Touch Plate Thickness')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={touchPlateHeight}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleTouchPlateHeightChange}
                                    />
                                    <span className="input-group-addon">{displayUnits}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-6" style={{ paddingLeft: 5 }}>
                            <div className="form-group">
                                <label className="control-label">{i18n._('Retraction Distance')}</label>
                                <div className="input-group input-group-sm">
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={retractionDistance}
                                        placeholder="0.00"
                                        min={0}
                                        step={step}
                                        onChange={actions.handleRetractionDistanceChange}
                                    />
                                    <span className="input-group-addon">{displayUnits}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={classNames(
                            'btn',
                            'btn-default'
                        )}
                        title={i18n._('Leveling')}
                        onClick={() => actions.autoLevel()}
                    >
                        AutoLevel
                    </button>
                    <button
                        type="button"
                        className={classNames(
                            'btn',
                            'btn-default'
                        )}
                        title={i18n._('Display')}
                        onClick={() => actions.displaySurface()}
                    >
                        Display
                    </button>
                </Widget.Content>
            </Widget>);
    }
    initSurface() {
        const sx = this.state.sx;
        const sy = this.state.sy;
        const dx = this.state.dx;
        const dy = this.state.dy;
        const ex = this.state.ex;
        const ey = this.state.ey;
        pubsub.publish('autolevel:init', { sx, sy, dx, dy, ex, ey });
        var x = 0.0;
        var y = 0.0;
        var points = [];
        for (y = sy; y <= ey; y += dy) {
            for (x = sx; x <= ex; x += dx) {
                points.push({ x: x, y: y });
            }
        }
        this.state.points = points;
    }
    firstPoint() {
        var point = this.state.points.shift();
        if (point) {
            this.state.currentPoint = point;
            controller.command('gcode', 'G90');
            controller.command('gcode', 'G0 X' + point.x + ' Y' + point.y);
            controller.command('gcode', 'G91');
            controller.command('gcode', 'G38.2 Z-' + this.state.probeDepth + ' F' + this.state.probeFeedrate);
            controller.command('gcode', 'G90');
            controller.command('gcode', 'G10 L20 P1 Z' + this.state.touchPlateHeight);
        }
    }
    nextPoint() {
        var point = this.state.points.shift();
        if (point) {
            console.log('New point at (' + point.x + ',' + point.y + ')');
            this.state.currentPoint = point;
            controller.command('gcode', 'G91');
            controller.command('gcode', 'G0 Z' + this.state.retractionDistance);
            controller.command('gcode', 'G90');
            controller.command('gcode', 'G0 X' + point.x + ' Y' + point.y);
            controller.command('gcode', 'G91');
            controller.command('gcode', 'G38.2 Z-' + this.state.probeDepth + ' F' + this.state.probeFeedrate);
            controller.command('gcode', 'G90');
            return;
        }
        this.state.currentPoint = null;
        controller.command('gcode', 'G91');
        controller.command('gcode', 'G0 Z' + this.state.retractionDistance);
        controller.command('gcode', 'G90');
        pubsub.publish('autolevel:finish');
        console.log('END');
    }
    actions = {
        handleProbeDepthChange: (event) => {
            const probeDepth = parseFloat(event.target.value);
            this.setState({
                probeDepth
            });
        },
        handleProbeFeedrateChange: (event) => {
            const probeFeedrate = parseFloat(event.target.value);
            this.setState({
                probeFeedrate
            });
        },
        handleTouchPlateHeightChange: (event) => {
            const touchPlateHeight = parseFloat(event.target.value);
            this.setState({
                touchPlateHeight
            });
        },
        handleRetractionDistanceChange: (event) => {
            const retractionDistance = parseFloat(event.target.value);
            this.setState({
                retractionDistance
            });
        },
        handleEXChange: (event) => {
            const ex = parseFloat(event.target.value);
            this.setState({
                ex
            });
        },
        handleEYChange: (event) => {
            const ey = parseFloat(event.target.value);
            this.setState({
                ey
            });
        },
        handleDXChange: (event) => {
            const dx = parseFloat(event.target.value);
            this.setState({
                dx
            });
        },
        handleDYChange: (event) => {
            const dy = parseFloat(event.target.value);
            this.setState({
                dy
            });
        },
        handleSXChange: (event) => {
            const sx = parseFloat(event.target.value);
            this.setState({
                sx
            });
        },
        handleSYChange: (event) => {
            const sy = parseFloat(event.target.value);
            this.setState({
                sy
            });
        },
        displaySurface: () => {
            this.initSurface();
            pubsub.publish('autolevel:point', { x: 0.0, y: 0.0, z: 0.0 });
            pubsub.publish('autolevel:point', { x: 16.0, y: 0.0, z: 1.0 });
            pubsub.publish('autolevel:point', { x: 0.0, y: 16.0, z: 1.0 });
            pubsub.publish('autolevel:point', { x: 16.0, y: 16.0, z: 0.0 });
            pubsub.publish('autolevel:finish');
        },
        autoLevel: () => {
            this.initSurface();
            this.firstPoint();
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
    };
    controllerEvents = {
        'controller:state': (type, controllerState) => {
            const { status } = { ...controllerState };
            const { wpos } = status;
            this.setState(state => ({
                workPosition: wpos
            }));
            if (controllerState.status.activeState === 'Idle') {
                const x = parseFloat(wpos.x);
                const y = parseFloat(wpos.y);
                const z = parseFloat(wpos.z);
                var point = this.state.currentPoint;
                if (point && point.x === x && point.y === y) {
                    pubsub.publish('autolevel:point', { x, y, z });
                    this.nextPoint();
                }
            }
        }
    };
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.addListener(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.removeListener(eventName, callback);
        });
    }
    componentDidMount() {
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
}

export default AutoLevelWidget;
