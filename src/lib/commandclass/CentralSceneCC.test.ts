import { createEmptyMockDriver } from "../../../test/mocks";
import { IDriver } from "../driver/IDriver";
import {
	CentralSceneCC,
	CentralSceneCCConfigurationGet,
	CentralSceneCCConfigurationReport,
	CentralSceneCCConfigurationSet,
	CentralSceneCCNotification,
	CentralSceneCCSupportedGet,
	CentralSceneCCSupportedReport,
	CentralSceneCommand,
	CentralSceneKeys,
} from "./CentralSceneCC";
import { CommandClasses } from "./CommandClasses";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

function buildCCBuffer(nodeId: number, payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			nodeId, // node number
			payload.length + 1, // remaining length
			CommandClasses["Central Scene"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/CentralSceneCC => ", () => {
	it("the ConfigurationGet command should serialize correctly", () => {
		const cc = new CentralSceneCCConfigurationGet(fakeDriver, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			1,
			Buffer.from([
				CentralSceneCommand.ConfigurationGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command should serialize correctly (flags set)", () => {
		const cc = new CentralSceneCCConfigurationSet(fakeDriver, {
			nodeId: 2,
			slowRefresh: true,
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				CentralSceneCommand.ConfigurationSet, // CC Command
				0b1000_0000,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command should serialize correctly (flags not set)", () => {
		const cc = new CentralSceneCCConfigurationSet(fakeDriver, {
			nodeId: 2,
			slowRefresh: false,
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				CentralSceneCommand.ConfigurationSet, // CC Command
				0,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				CentralSceneCommand.ConfigurationReport, // CC Command
				0b1000_0000,
			]),
		);
		const cc = new CentralSceneCCConfigurationReport(fakeDriver, {
			data: ccData,
		});

		expect(cc.slowRefresh).toBe(true);
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new CentralSceneCCSupportedGet(fakeDriver, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			1,
			Buffer.from([
				CentralSceneCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				CentralSceneCommand.SupportedReport, // CC Command
				2, // # of scenes
				0b1_0000_10_0, // slow refresh, 2 bytes per scene, not identical
				0b1, // scene 1, key 1
				0b11, // scene 1, keys 9, 10
				0b10101, // scene 2, keys 1,3,5
				0,
			]),
		);
		const cc = new CentralSceneCCSupportedReport(fakeDriver, {
			data: ccData,
		});

		expect(cc.sceneCount).toBe(2);
		expect(cc.supportsSlowRefresh).toBeTrue();
		expect(cc.keyAttributesHaveIdenticalSupport).toBeFalse();
		expect(cc.supportedKeyAttributes.size).toBe(2);
		expect(cc.supportedKeyAttributes.get(1)).toEqual([1, 9, 10]);
		expect(cc.supportedKeyAttributes.get(2)).toEqual([1, 3, 5]);
	});

	it("the Notification command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				CentralSceneCommand.Notification, // CC Command
				7, // sequence number
				0b1000_0000 | CentralSceneKeys.KeyPressed4x, // slow refresh
				8, // scene number
			]),
		);
		const cc = new CentralSceneCCNotification(fakeDriver, {
			data: ccData,
		});

		expect(cc.sequenceNumber).toBe(7);
		// slow refresh is only evaluated if the attribute is KeyHeldDown
		expect(cc.slowRefresh).toBeFalsy();
		expect(cc.keyAttribute).toBe(CentralSceneKeys.KeyPressed4x);
		expect(cc.sceneNumber).toBe(8);
	});

	it("the Notification command should be deserialized correctly (KeyHeldDown)", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				CentralSceneCommand.Notification, // CC Command
				7, // sequence number
				0b1000_0000 | CentralSceneKeys.KeyHeldDown, // slow refresh
				8, // scene number
			]),
		);
		const cc = new CentralSceneCCNotification(fakeDriver, {
			data: ccData,
		});

		expect(cc.sequenceNumber).toBe(7);
		expect(cc.slowRefresh).toBeTrue();
		expect(cc.keyAttribute).toBe(CentralSceneKeys.KeyHeldDown);
		expect(cc.sceneNumber).toBe(8);
	});

	it("deserializing an unsupported command should return an unspecified version of CentralSceneCC", () => {
		const serializedCC = buildCCBuffer(
			1,
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new CentralSceneCC(fakeDriver, {
			data: serializedCC,
		});
		expect(cc.constructor).toBe(CentralSceneCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.CentralScene,
	// 		"currentValue",
	// 	);
	// 	expect(currentValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: false,
	// 		min: 0,
	// 		max: 99,
	// 	});

	// 	// Writeable, 0-99
	// 	const targetValueMeta = getCCValueMetadata(
	// 		CommandClasses.CentralScene,
	// 		"targetValue",
	// 	);
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });
});
