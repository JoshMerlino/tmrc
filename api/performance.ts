/* eslint-disable camelcase */
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Request, Response } from "express";
import osu, { os } from "node-os-utils";
import prettyBytes from "pretty-bytes";
import si from "systeminformation";
dayjs.extend(duration);

export const route = "v3/performance";

const sections: Record<string, unknown> = {
	cpu: null,
	ram: null,
	disk: null,
	network: null
};

const cpuUsage = Array(60).fill(0);
const memUsage = Array(60).fill(0);
const diskUsage = Array(60).fill(0);
const netUsage = Array(60).fill(0);

(async function stat() {
	const cpu = await si.cpu();
	const usageNow = await osu.cpu.usage() / osu.cpu.count() / 100;
	cpuUsage.push(usageNow);
	cpuUsage.shift();
	sections.cpu = {
		title: "CPU",
		subtitle: `${cpu.manufacturer} ${cpu.brand}`,
		description: "% Utilization over 60 seconds",
		usageHistory: cpuUsage,
		usageNow,
		color: "#0ea5e9",
		info: {
			left: [ {
				name: "Utilization",
				value: usageNow,
				value_formatted: `${Math.round(usageNow * 100)}%`
			}, {
				name: "Speed",
				value: cpu.speed,
				value_formatted: `${cpu.speed} GHz`
			},
			null,
			{
				name: "Up time",
				value: os.uptime(),
				value_formatted: dayjs.duration(os.uptime() * 1000).format("D:HH:mm:ss")
			} ],
			right: [ {
				name: "Base speed",
				value: cpu.speedMax || cpu.speed,
				value_formatted: `${cpu.speedMax || cpu.speed} GHz`
			}, {
				name: "Sockets",
				value: parseInt(cpu.socket || "1"),
				value_formatted: parseInt(cpu.socket || "1").toString()
			}, {
				name: "Cores",
				value: cpu.physicalCores,
				value_formatted: cpu.physicalCores.toString()
			}, {
				name: "Logical processors",
				value: cpu.cores,
				value_formatted: cpu.cores.toString()
			}, {
				name: "Virtualization",
				value: cpu.virtualization,
				value_formatted: cpu.virtualization ? "Enabled" : "Disabled"
			} ]
		}
	};
	setTimeout(stat, 1000);
}());

(async function stat() {
	const mem = await si.mem();
	const memlayout = await si.memLayout();
	const usageNow = mem.used / mem.total;
	memUsage.push(usageNow);
	memUsage.shift();
	sections.ram = {
		title: "Memory",
		subtitle: prettyBytes(memlayout[0].size),
		description: "Memory usage",
		usageHistory: memUsage,
		usageNow,
		color: "#a855f7",
		info: {
			left: [ {
				name: "In use",
				value: mem.used,
				value_formatted: prettyBytes(mem.used)
			}, {
				name: "Available",
				value: mem.free,
				value_formatted: prettyBytes(mem.free)
			},
			null,
			{
				name: "Swap use",
				value: mem.swapused,
				value_formatted: prettyBytes(mem.swapused)
			}, {
				name: "Swap available",
				value: mem.swapfree,
				value_formatted: prettyBytes(mem.swapfree)
			} ],
			right: [ {
				name: "Memory total",
				value: mem.total + mem.total,
				value_formatted: prettyBytes(mem.total + mem.total)
			}, {
				name: "Memory used",
				value: mem.swapused + mem.used,
				value_formatted: prettyBytes(mem.swapused + mem.used)
			}, {
				name: "Memory available",
				value: mem.swapfree + mem.free,
				value_formatted: prettyBytes(mem.swapfree + mem.free)
			} ]
		}
	};

	setTimeout(stat, 1000);
}());

(async function stat() {
	const disks = await si.fsSize();
	const usageNow = disks.reduce((a, b) => a + b.used, 0) / disks.reduce((a, b) => a + b.size, 0);
	diskUsage.push(usageNow);
	diskUsage.shift();
	sections.disk = {
		title: "Disk",
		subtitle: "",
		description: "Disk usage",
		usageHistory: diskUsage,
		usageNow,
		color: "#22c55e",
		info: {
			left: [ {
				name: "In use",
				value: disks.reduce((a, b) => a + b.used, 0),
				value_formatted: prettyBytes(disks.reduce((a, b) => a + b.used, 0))
			}, {
				name: "Total",
				value: disks.reduce((a, b) => a + b.size, 0),
				value_formatted: prettyBytes(disks.reduce((a, b) => a + b.size, 0))
			} ],
			right: []
		}
	};
	setTimeout(stat, 1000);
}());

(async function stat() {
	const stats = await si.networkStats();
	const interfaces = (await si.networkInterfaces()).filter(i => i.ip4.startsWith("10.16") || i.ip4.startsWith("192.168.75"));
	const speed = interfaces[0].speed * 1000000;
	const usageNow = stats.reduce((a, b) => a + b.rx_sec * 8, 0) / speed;
	netUsage.push(usageNow);
	netUsage.shift();
	sections.network = {
		title: "Network",
		subtitle: prettyBytes(speed, { bits: true }),
		description: "Network usage",
		usageHistory: netUsage,
		usageNow,
		color: "#eab308",
		info: {
			left: [ {
				name: "Download",
				value: stats.reduce((a, b) => a + b.rx_sec * 8, 0),
				value_formatted: prettyBytes(stats.reduce((a, b) => a + b.rx_sec * 8, 0), { bits: true }) + "/s"
			}, {
				name: "Upload",
				value: stats.reduce((a, b) => a + b.tx_sec * 8, 0),
				value_formatted: prettyBytes(stats.reduce((a, b) => a + b.tx_sec * 8, 0), { bits: true }) + "/s"
			} ],
			right: []
		}
	};

	setTimeout(stat, 1000);
}());

export default function api(_req: Request, res: Response): void {
	res.json({});
}
