import React, { Component } from 'react';
import PropTypes from 'prop-types';
import shortid from 'shortid';
import Box from './Box';
import { calculateGuidePositions, proximityListener } from './utils/helpers';
import styles from './styles.scss';

class AlignmentGuides extends Component {
	constructor(props) {
		super(props);
		this.boundingBox = React.createRef();
		this.state = {
			boundingBoxDimensions: null,
			boxes: {},
			guides: {},
			match: {}
		};
		this.onDragHandler = this.onDragHandler.bind(this);
		this.selectBox = this.selectBox.bind(this);
	}

	componentDidMount() {
		// Set the dimensions of the bounding box and the draggable boxes when the component mounts.
		if (this.boundingBox.current && this.state.boundingBoxDimensions === null) {
			const boundingBoxDimensions = this.boundingBox.current.getBoundingClientRect().toJSON();
			const boxes = {};
			const guides = {};

			// Adding the guides for the bounding box to the guides object
			guides.boundingBox = {
				x: calculateGuidePositions(boundingBoxDimensions, 'x'),
				y: calculateGuidePositions(boundingBoxDimensions, 'y')
			};

			this.props.boxes.forEach((dimensions, index) => {
				boxes[`box${index}`] = dimensions;
				guides[`box${index}`] = {
					x: calculateGuidePositions(dimensions, 'x'),
					y: calculateGuidePositions(dimensions, 'y')
				};
			});

			this.setState({
				boundingBoxDimensions,
				boxes,
				guides
			});
		}
	}

	onDragHandler(e, data) {
		const dimensions = Object.assign({}, this.state.boxes[data.node.id], {
			left: data.currentX,
			top: data.currentY
		});
		this.props.onDrag && this.props.onDrag(e, data);
		this.setState({
			boxes: Object.assign({}, this.state.boxes, {
				[data.node.id]: Object.assign({}, this.state.boxes[data.node.id], {
					left: data.currentX,
					top: data.currentY
				})
			}),
			guides: Object.assign({}, this.state.guides, {
				[data.node.id]: Object.assign({}, this.state.guides[data.node.id], {
					x: calculateGuidePositions(dimensions, 'x'),
					y: calculateGuidePositions(dimensions, 'y')
				})
			})
		}, () => {
			const match = proximityListener(this.state.active, this.state.guides);
			let newActiveBoxLeft = this.state.boxes[this.state.active].left;
			let newActiveBoxTop = this.state.boxes[this.state.active].top;
			for (let axis in match) {
				const { activeBoxGuides, matchedArray, proximity } = match[axis];
				const activeBoxProximityIndex = proximity.activeBoxIndex;
				const matchedBoxProximityIndex = proximity.matchedBoxIndex;

				if (axis === 'x') {
					if (activeBoxGuides[activeBoxProximityIndex] > matchedArray[matchedBoxProximityIndex]) {
						newActiveBoxLeft = this.state.boxes[this.state.active].left - proximity.value;
					} else {
						newActiveBoxLeft = this.state.boxes[this.state.active].left + proximity.value;
					}
				} else {
					if (activeBoxGuides[activeBoxProximityIndex] > matchedArray[matchedBoxProximityIndex]) {
						newActiveBoxTop = this.state.boxes[this.state.active].top - proximity.value;
					} else {
						newActiveBoxTop = this.state.boxes[this.state.active].top + proximity.value;
					}
				}
			}
			const boxes = Object.assign({}, this.state.boxes, {
				[this.state.active]: Object.assign({}, this.state.boxes[this.state.active], {
					left: newActiveBoxLeft,
					top: newActiveBoxTop
				})
			});
			const guides = Object.assign({}, this.state.guides, {
				[this.state.active]: Object.assign({}, this.state.guides[this.state.active], {
					x: calculateGuidePositions(boxes[this.state.active], 'x'),
					y: calculateGuidePositions(boxes[this.state.active], 'y')
				})
			})
			this.setState({
				boxes,
				guides,
				match
			});
		});
	}

	selectBox(e) {
		this.setState({
			active: e.target.id
		});
	}

	render() {
		const { active, boxes, guides } = this.state;

		// Create the draggable boxes from the position data
		const draggableBoxes = Object.keys(boxes).map((box, index) => {
			const position = boxes[box];
			const id = `box${index}`;

			return <Box
				{...this.props}
				defaultPosition={position}
				id={id}
				isSelected={active === id}
				key={shortid.generate()}
				onDragStart={this.selectBox}
				onDrag={this.onDragHandler}
				selectBox={this.selectBox}
			/>
		});

		// Create a guide(s) when the following conditions are met:
		// 1. A box aligns with another (top, center or bottom)
		// 2. An edge of a box touches any of the edges of another box
		// 3. A box aligns vertically or horizontally with the bounding box
		const xAxisGuides = Object.keys(guides).reduce((result, box) => {
			const xAxisGuidesForCurrentBox = guides[box].x.map(position => {
				if (
					this.state.active &&
					this.state.active === box &&
					this.state.match &&
					this.state.match.x &&
					this.state.match.x.intersection &&
					this.state.match.x.intersection === position
				) {
					return <div key={shortid.generate()} className={`${styles.guide} ${styles.xAxis}`} style={{ left: position }} />;
				} else {
					return null;
				}
			});

			return result.concat(xAxisGuidesForCurrentBox);
		}, []);

		const yAxisGuides = Object.keys(guides).reduce((result, box) => {
			const yAxisGuidesForCurrentBox = guides[box].y.map(position => {
				if (
					this.state.active &&
					this.state.active === box &&
					this.state.match &&
					this.state.match.y &&
					this.state.match.y.intersection &&
					this.state.match.y.intersection === position
				) {
					return <div key={shortid.generate()} className={`${styles.guide} ${styles.yAxis}`} style={{ top: position }} />
				} else {
					return null;
				}
			});

			return result.concat(yAxisGuidesForCurrentBox);
		}, []);

		return <div ref={this.boundingBox} className={styles.boundingBox} style={{ width: '100vw', height: '100vh' }}>
			{draggableBoxes}
			{xAxisGuides}
			{yAxisGuides}
		</div>;
	}
}

AlignmentGuides.propTypes = {
	drag: PropTypes.bool,
	resize: PropTypes.bool,
	rotate: PropTypes.bool,
	keybindings: PropTypes.bool,
	onRotateStart: PropTypes.func,
	onRotate: PropTypes.func,
	onRotateEnd: PropTypes.func,
	onResizeStart: PropTypes.func,
	onResize: PropTypes.func,
	onResizeEnd: PropTypes.func,
	onDragStart: PropTypes.func,
	onDrag: PropTypes.func,
	onDragEnd: PropTypes.func
};

export default AlignmentGuides;