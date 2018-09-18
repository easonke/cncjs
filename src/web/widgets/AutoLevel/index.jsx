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
        const sx = parseFloat(this.state.workPosition.x);
        const sy = parseFloat(this.state.workPosition.y);
        const dx = 14.0;
        const dy = 14.0;
        const ex = sx + dx * 1;
        const ey = sy + dy * 1;
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
            controller.command('gcode', 'G91');
            controller.command('gcode', 'G38.2 Z-10 F60');
            controller.command('gcode', 'G90');
            controller.command('gcode', 'G10 L20 P1 Z0');
        }
    }
    nextPoint() {
        var point = this.state.points.shift();
        if (point) {
            console.log('New point at (' + point.x + ',' + point.y + ')');
            this.state.currentPoint = point;
            controller.command('gcode', 'G91');
            controller.command('gcode', 'G0 Z10');
            controller.command('gcode', 'G90');
            controller.command('gcode', 'G0 X' + point.x + ' Y' + point.y);
            controller.command('gcode', 'G91');
            controller.command('gcode', 'G38.2 Z-20 F60');
            controller.command('gcode', 'G90');
            return;
        }
        this.state.currentPoint = null;
        pubsub.publish('autolevel:finish');
        console.log('END');
    }
    actions = {
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
