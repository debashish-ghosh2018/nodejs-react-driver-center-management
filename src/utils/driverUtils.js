function getDriverAvailabilityClass(availability) {
    switch (String(availability || "").toUpperCase()) {
        case "AVAILABLE":
        case "ONLINE":
            return "bg-success";

        case "BUSY":
        case "ON_TRIP":
            return "bg-warning text-dark";

        case "OFFLINE":
        case "UNAVAILABLE":
            return "bg-secondary";

        default:
            return "bg-secondary";
    }
}

module.exports = {getDriverAvailabilityClass};