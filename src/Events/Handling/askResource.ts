import { AskResourcePayload, ProvideResourcePayload } from 'kozz-types';
import { Socket } from 'socket.io';
import { getBoundary, getBoundaryByName } from '../../Boundaries';
import { getHandler, getHandlerByName } from '../../Handlers';
import { getAllBoundaries, getAllHandlers } from './Getters';

export const ask_resource = (socket: Socket) => (payload: AskResourcePayload) => {
	if (payload.responder.type === 'Handler') {
		return askHandler(payload);
	}
	if (payload.responder.type === 'Boundary') {
		return askBoundary(payload);
	}
	if (payload.responder.type === 'Gateway') {
		return askGateway(payload);
	}
};

export const reply_resource =
	(socket: Socket) => (payload: ProvideResourcePayload) => {
		const destinyEntityType = payload.requester.type;

		const destinationEntity = (() => {
			const entityId = payload.requester.id;
			if (destinyEntityType === 'Boundary')
				return getBoundary(entityId) || getBoundaryByName(entityId);
			if (destinyEntityType === 'Handler')
				return getHandler(entityId) || getHandlerByName(entityId);
			// Gateway can't ask any entity so it can't be the target of the response;
		})();

		destinationEntity?.socket.emit(`reply_resource/${payload.request.id}`, payload);
	};

/**
 * Forwards request to the correct boundary
 * @param payload
 * @returns
 */
const askBoundary = (payload: AskResourcePayload) => {
	const boundary =
		getBoundary(payload.responder.id) || getBoundaryByName(payload.responder.id);
	if (!boundary) {
		return;
	}

	boundary.socket.emit('ask_resource', payload);
};

/**
 * Forwards request to the correct boundary
 * @param payload
 * @returns
 */
const askHandler = (payload: AskResourcePayload) => {
	const handler =
		getHandler(payload.responder.id) || getHandlerByName(payload.responder.id);
	if (!handler) {
		return;
	}

	handler.socket.emit('ask_resource', payload);
};

const askGateway = (payload: AskResourcePayload) => {
	const response = (() => {
		if (payload.request.resource === 'all_boundaries') {
			return getAllBoundaries();
		}
		if (payload.request.resource === 'all_modules') {
			return getAllHandlers();
		}
	})();

	const destinyEntityType = payload.requester.type;

	const destinationEntity = (() => {
		const entityId = payload.requester.id;
		if (destinyEntityType === 'Boundary')
			return getBoundary(entityId) || getBoundaryByName(entityId);
		if (destinyEntityType === 'Handler')
			return getHandler(entityId) || getHandlerByName(entityId);
	})();

	const responsePayload: ProvideResourcePayload = {
		...payload,
		response,
	};

	destinationEntity?.socket.emit(
		`reply_resource/${payload.request.id}`,
		responsePayload
	);
};
