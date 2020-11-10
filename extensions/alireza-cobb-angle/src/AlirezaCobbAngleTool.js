import csTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';
import { getIntersection } from './utils';
const BaseAnnotationTool = csTools.importInternal('base/BaseAnnotationTool');
const getNewContext = csTools.importInternal('drawing/getNewContext');
const draw = csTools.importInternal('drawing/draw');
const setShadow = csTools.importInternal('drawing/setShadow');
const drawLine = csTools.importInternal('drawing/drawLine');
const drawLinkedTextBox = csTools.importInternal('drawing/drawLinkedTextBox');
const textBoxWidth = csTools.importInternal('drawing/textBoxWidth');
const drawHandles = csTools.importInternal('drawing/drawHandles');
const lineSegDistance = csTools.importInternal('util/lineSegDistance');
const getLogger = csTools.importInternal('util/getLogger');
const getPixelSpacing = csTools.importInternal('util/getPixelSpacing');
const throttle = csTools.importInternal('util/throttle');
const roundToDecimal = csTools.importInternal('util/roundToDecimal');
const moveNewHandle = csTools.importInternal('manipulators/moveNewHandle');
const MouseCursor = csTools.importInternal('tools/cursors');
const triggerEvent = csTools.importInternal('util/triggerEvent');

const logger = getLogger('tools:annotation:alireza');

/*
 * @public
 * @class RotateTool
 * @memberof Tools
 *
 * @classdesc Tool for rotating the image.
 * @extends Tools.Base.BaseTool
 */
export default class AlirezaCobbAngleTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'AlirezaCobbAngle',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      svgCursor: MouseCursor.cobbAngleCursor,
      configuration: {
        drawHandles: true,
        drawHandlesOnHover: false,
        hideHandlesIfMoving: false,
        renderDashed: false,
      },
    };

    super(props, defaultProps);
    this.finishedFirstLine = false;
    this.annotationID = 0;
    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  createNewMeasurement(eventData) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const { x, y } = eventData.currentPoints.image;

    return {
      visible: true,
      active: true,
      color: undefined,
      invalidated: true,
      handles: {
        start: {
          x,
          y,
          highlight: true,
          active: false,
        },
        end: {
          x,
          y,
          highlight: true,
          active: true,
        },
        start2: {
          x,
          y,
          highlight: true,
          active: false,
        },
        end2: {
          x,
          y,
          highlight: true,
          active: true,
        },
        textBox: {
          active: false,
          hasMoved: false,
          movesIndependently: false,
          drawnIndependently: true,
          allowedOutsideImage: true,
          hasBoundingBox: true,
        },
      },
    };
  }

  /**
   *
   *
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {Boolean}
   */
  pointNearTool(element, data, coords) {
    const hasStartAndEndHandles =
      data && data.handles && data.handles.start && data.handles.end;
    const validParameters = hasStartAndEndHandles;

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );

      return false;
    }

    if (data.visible === false) {
      return false;
    }

    return (
      lineSegDistance(element, data.handles.start, data.handles.end, coords) <
        25 ||
      lineSegDistance(element, data.handles.start2, data.handles.end2, coords) <
        25
    );
  }

  updateCachedStats(image, element, data) {
    let angle;
    // to check if only the first line has been drawn
    if (
      data.handles.end2.x === data.handles.start2.x &&
      data.handles.end2.y === data.handles.start2.y
    ) {
      var dBx = data.handles.end.x - data.handles.start.x;
      var dBy = data.handles.end.y - data.handles.start.y;
      angle = Math.atan2(dBy, dBx);
    } else {
      var dAx = data.handles.end2.x - data.handles.start2.x;
      var dAy = data.handles.end2.y - data.handles.start2.y;
      var dBx = data.handles.end.x - data.handles.start.x;
      var dBy = data.handles.end.y - data.handles.start.y;
      angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);
    }
    if (angle < 0) {
      angle = angle * -1;
    }
    var degree_angle = angle * (180 / Math.PI);

    // let angle =
    //   (Math.atan2(
    //     data.handles.end.y - data.handles.start.y,
    //     data.handles.start.x - data.handles.end.x
    //   ) *
    //     180) /
    //   Math.PI;

    data.rAngle = roundToDecimal(degree_angle, 2);
    data.invalidated = false;
  }

  renderToolData(evt) {
    const eventData = evt.detail;
    const enabledElement = eventData.enabledElement;
    const {
      handleRadius,
      drawHandlesOnHover,
      hideHandlesIfMoving,
      renderDashed,
    } = this.configuration;
    const toolData = csTools.getToolState(evt.currentTarget, this.name);

    if (!toolData) {
      return;
    }

    // We have tool data for this element - iterate over each one and draw it
    const context = getNewContext(eventData.canvasContext.canvas);
    const { image, element } = eventData;
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

    const lineWidth = csTools.toolStyle.getToolWidth();
    const lineDash = csTools.getModule('globalConfiguration').configuration
      .lineDash;

    for (let i = 0; i < toolData.data.length; i++) {
      const data = toolData.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        let textCoords;
        // Configurable shadow
        setShadow(context, this.configuration);

        const color = csTools.toolColors.getColorIfActive(data);

        const lineOptions = { color };

        if (renderDashed) {
          lineOptions.lineDash = lineDash;
        }

        drawLine(
          context,
          element,
          data.handles.start,
          data.handles.end,
          lineOptions
        );

        drawLine(
          context,
          element,
          data.handles.start2,
          data.handles.end2,
          lineOptions
        );

        if (this.finishedFirstLine) {
          const intersection = getIntersection(data.handles);
          // dashed line
          const firstLineMiddleStart = {
            x: (data.handles.start.x + data.handles.end.x) / 2,
            y: (data.handles.start.y + data.handles.end.y) / 2,
          };
          const secondLineMiddleStart = {
            x: (data.handles.start2.x + data.handles.end2.x) / 2,
            y: (data.handles.start2.y + data.handles.end2.y) / 2,
          };

          lineOptions.lineDash = lineDash;

          drawLine(
            context,
            element,
            firstLineMiddleStart,
            intersection,
            lineOptions
          );

          drawLine(
            context,
            element,
            secondLineMiddleStart,
            intersection,
            lineOptions
          );
        }

        // }

        // Draw the handles
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
          hideHandlesIfMoving,
        };

        if (this.configuration.drawHandles) {
          drawHandles(context, eventData, data.handles, handleOptions);
        }
        if (!data.handles.textBox.hasMoved) {
          textCoords = {
            x: (data.handles.start.x + data.handles.end.x) / 2,
            y: (data.handles.start.y + data.handles.end.y) / 2,
          };

          const padding = 1;
          const textWidth = textBoxWidth(context, text, padding);

          // if (handleMiddleCanvas.x < handleStartCanvas.x) {
          //   textCoords.x -= distance + textWidth + 10;
          // } else {
          //   textCoords.x += distance;
          // }

          // const transform = cornerstone.internal.getTransform(enabledElement);

          // transform.invert();

          // const coords = transform.transformPoint(textCoords.x, textCoords.y);
          let yOffSet = -30;
          data.handles.textBox.x = textCoords.x;
          data.handles.textBox.y = textCoords.y + yOffSet;
        }

        // Update textbox stats
        if (data.invalidated === true) {
          this.updateCachedStats(image, element, data);
          // if (data.length) {
          //   this.throttledUpdateCachedStats(image, element, data);
          // } else {
          //   this.updateCachedStats(image, element, data);
          // }
        }
        // Move the textbox slightly to the right and upwards
        // So that it sits beside the length tool handle

        const text = textBoxText(data, rowPixelSpacing, colPixelSpacing);

        drawLinkedTextBox(
          context,
          element,
          data.handles.textBox,
          text,
          data.handles,
          textBoxAnchorPoints,
          color,
          lineWidth,
          0,
          true
        );
      });
    }

    // SideEffect: Updates annotation 'suffix'
    function textBoxText(annotation, rowPixelSpacing, colPixelSpacing) {
      const measuredValue = _sanitizeMeasuredValue(annotation.rAngle);

      // measured value is not defined, return empty string
      // if (!measuredValue) {
      //   return '';
      // }

      // Set the length text suffix depending on whether or not pixelSpacing is available
      let suffix = 'degree';

      annotation.unit = suffix;

      return `${measuredValue.toFixed(2)} ${suffix}`;
    }

    function textBoxAnchorPoints(handles) {
      const midpoint = {
        x: (handles.start.x + handles.end.x) / 2,
        y: (handles.start.y + handles.end.y) / 2,
      };

      return [handles.start, midpoint, handles.end];
    }
  }

  addNewMeasurement(evt, interactionType) {
    evt.preventDefault();
    evt.stopPropagation();

    const eventData = evt.detail;
    const element = evt.detail.element;
    let measurementData;

    if (!this.finishedFirstLine) {
      measurementData = this.createNewMeasurement(eventData);
      // Associate this data with this imageId so we can render it and manipulate it
      csTools.addToolState(element, this.name, measurementData);
      cornerstone.updateImage(element);
      moveNewHandle(
        eventData,
        this.name,
        measurementData,
        measurementData.handles.end,
        this.options,
        interactionType,
        success => {
          measurementData.active = false;

          if (!success) {
            removeToolState(element, this.name, measurementData);
            return;
          }

          measurementData.handles.end.active = true;

          cornerstone.updateImage(element);
          this.finishedFirstLine = true;
        }
      );
    } else {
      measurementData = csTools.getToolState(element, this.name).data[
        this.annotationID
      ];
      measurementData.handles.start2 = {
        x: eventData.currentPoints.image.x,
        y: eventData.currentPoints.image.y,
      };
      moveNewHandle(
        eventData,
        this.name,
        measurementData,
        measurementData.handles.end2,
        this.options,
        interactionType,
        success => {
          measurementData.active = false;
          if (!success) {
            removeToolState(element, this.name, measurementData);
            return;
          }
          measurementData.handles.end2.active = true;
          cornerstone.updateImage(element);
          this.finishedFirstLine = false;
          this.annotationID += 1;
        }
      );
      const modifiedEventData = {
        toolName: this.name,
        toolType: this.name, // Deprecation notice: toolType will be replaced by toolName
        element,
        measurementData,
      };

      triggerEvent(
        element,
        csTools.EVENTS.MEASUREMENT_COMPLETED,
        modifiedEventData
      );
    }
  }
}

/**
 * Attempts to sanitize a value by casting as a number; if unable to cast,
 * we return `undefined`
 *
 * @param {*} value
 * @returns a number or undefined
 */
function _sanitizeMeasuredValue(value) {
  const parsedValue = Number(value);
  const isNumber = !isNaN(parsedValue);

  return isNumber ? parsedValue : undefined;
}
