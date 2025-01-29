import { ForwardEventPayload, ForwardedEventPayload } from 'kozz-types';
import { Socket } from 'socket.io';
import {
	addListenerToBoundary,
	getBoundary,
	getBoundaryByName,
	removeListenerFromBoundary,
} from 'src/Boundaries';
import {
	addListenerToHandler,
	getHandler,
	getHandlerByName,
	removeListenerFromHandler,
} from 'src/Handlers';
import { getAllBoundaries, getAllHandlers } from './Getters';
import { delay } from 'src/Util';

export const event_forward_request =
	(socket: Socket) =>
	async ({ sourceId, destination, eventName }: ForwardEventPayload) => {
		const { type, id } = destination;
		await delay(5000);
		if (type === 'Boundary' && getBoundaryByName(id)) {
			addListenerToBoundary(destination.id, eventName, sourceId);
		} else if (type === 'Handler' && getHandlerByName(id)) {
			addListenerToHandler(destination.id, eventName, sourceId);
		} else {
			console.warn('Wrong payload');
		}
	};

export const event_forward_revoke =
	(socket: Socket) =>
	({ destination, eventName }: ForwardEventPayload) => {
		const sourceName = getHandler(socket.id)
			? getHandler(socket.id)?.name
			: getBoundary(socket.id)?.name;

		if (!sourceName) {
			return console.warn('Invalid source name');
		}

		const { type, id } = destination;

		if (type === 'Boundary' && getBoundaryByName(sourceName)) {
			removeListenerFromBoundary(destination.id, eventName);
		}

		if (type === 'Handler' && getHandlerByName(sourceName)) {
			removeListenerFromHandler(destination.id, eventName);
		}
	};

export const forward_event =
	(socket: Socket) =>
	({ eventName, payload }: ForwardedEventPayload) => {
		const source = (getBoundary(socket.id) || getHandler(socket.id))?.name;

		const allBoundaries = getAllBoundaries(true);
		allBoundaries.forEach(boundary => {
			const isListening = boundary.boundary.listeners.some(
				listener => listener.eventName === eventName && listener.source === source
			);

			console.log(`boundary ${boundary.boundary.name} is listening? ${isListening}`);

			if (isListening) {
				boundary.boundary.socket.emit('forwarded_event', {
					eventName,
					payload,
				});
			}
		});

		const allHandlers = getAllHandlers(true);
		allHandlers.forEach(handler => {
			const isListening = handler.handler.listeners.some(
				listener => listener.eventName === eventName && listener.source === source
			);
			if (isListening) {
				handler.handler.socket.emit('forwardedEvent', {
					eventName,
					payload,
				});
			}
		});
	};
