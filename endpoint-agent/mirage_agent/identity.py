import platform
import socket

from . import __version__


def device_metadata() -> dict[str, str]:
    operating_system = platform.system()
    os_version = platform.version()
    if operating_system == "Linux":
        os_version = platform.freedesktop_os_release().get("PRETTY_NAME", os_version)
    elif operating_system == "Windows":
        os_version = platform.platform()
    return {
        "hostname": socket.gethostname()[:255],
        "operatingSystem": operating_system[:64],
        "osVersion": os_version[:128],
        "agentVersion": __version__,
    }
