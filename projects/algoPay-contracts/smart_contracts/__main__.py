import dataclasses
import importlib
import logging
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from shutil import rmtree

from algokit_utils.config import config
from dotenv import load_dotenv

# Set trace_all to True to capture all transactions, defaults to capturing traces only on failure
# Learn more about using AlgoKit AVM Debugger to debug your TEAL source codes and inspect various kinds of
# Algorand transactions in atomic groups -> https://github.com/algorandfoundation/algokit-avm-vscode-debugger
config.configure(debug=True, trace_all=False)

# Set up logging and load environment variables.
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s %(levelname)-10s: %(message)s"
)
logger = logging.getLogger(__name__)
logger.info("Loading .env")
load_dotenv()

# Determine the root path based on this file's location.
root_path = Path(__file__).parent

# ----------------------- Contract Configuration ----------------------- #


@dataclasses.dataclass
class SmartContract:
    path: Path
    name: str
    deploy: Callable[[], None] | None = None


def get_contract_files(folder: Path) -> list[Path]:
    """Returns all contract files in a folder."""
    result = []
    for f in folder.glob("*_contract.py"):
        result.append(f)
    for f in folder.glob("contract.py"):
        result.append(f)
    for f in folder.glob("*_agent.py"):
        result.append(f)
    for f in folder.glob("*_registry.py"):
        result.append(f)
    return result


def get_deploy_file(folder: Path) -> Path | None:
    """Returns the deploy config file for a folder if it exists."""
    for pattern in ["*_deploy.py", "deploy_config.py"]:
        matches = list(folder.glob(pattern))
        if matches:
            return matches[0]
    return None


def import_deploy_if_exists(folder: Path) -> Callable[[], None] | None:
    """Imports the deploy function from a folder if it exists."""
    deploy_file = get_deploy_file(folder)
    if deploy_file is None:
        return None
    try:
        module_name = f"{folder.parent.name}.{folder.name}.{deploy_file.stem}"
        deploy_module = importlib.import_module(module_name)
        return deploy_module.deploy  # type: ignore[no-any-return, misc]
    except ImportError:
        return None


def has_contract_file(directory: Path) -> bool:
    """Checks whether the directory contains any contract files."""
    return len(get_contract_files(directory)) > 0


# Use the current directory (root_path) as the base for contract folders and exclude
# folders that start with '_' (internal helpers).
contracts: list[SmartContract] = []
for folder in root_path.iterdir():
    if (
        folder.is_dir()
        and has_contract_file(folder)
        and not folder.name.startswith("_")
    ):
        for contract_file in get_contract_files(folder):
            if contract_file.name == "contract.py":
                contract_name = folder.name
            else:
                contract_name = contract_file.stem.replace("_contract", "")
                contract_name = f"{folder.name}_{contract_name}"
            contracts.append(
                SmartContract(
                    path=contract_file,
                    name=contract_name,
                    deploy=import_deploy_if_exists(folder),
                )
            )

# -------------------------- Build Logic -------------------------- #

deployment_extension = "py"


def _get_output_path(output_dir: Path, deployment_extension: str) -> Path:
    """Constructs the output path for the generated client file."""
    return output_dir / Path(
        "{contract_name}"
        + ("_client" if deployment_extension == "py" else "Client")
        + f".{deployment_extension}"
    )


def build(output_dir: Path, contract_path: Path) -> Path:
    """
    Builds the contract by exporting (compiling) its source and generating a client.
    If the output directory already exists, it is cleared.
    """
    output_dir = output_dir.resolve()
    if output_dir.exists():
        rmtree(output_dir)
    output_dir.mkdir(exist_ok=True, parents=True)
    logger.info(f"Exporting {contract_path} to {output_dir}")

    build_result = subprocess.run(
        [
            "algokit",
            "--no-color",
            "compile",
            "python",
            str(contract_path.resolve()),
            f"--out-dir={output_dir}",
            "--output-source-map",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    if build_result.stdout:
        print(build_result.stdout)

    if build_result.returncode:
        raise Exception(f"Could not build contract:\n{build_result.stdout}")

    # Look for arc56.json files and generate the client based on them.
    app_spec_file_names: list[str] = [
        file.name for file in output_dir.glob("*.arc56.json")
    ]

    client_file: str | None = None
    if not app_spec_file_names:
        logger.warning(
            "No '*.arc56.json' file found (likely a logic signature being compiled). Skipping client generation."
        )
    else:
        for file_name in app_spec_file_names:
            client_file = file_name
            print(file_name)
            generate_result = subprocess.run(
                [
                    "algokit",
                    "generate",
                    "client",
                    str(output_dir),
                    "--output",
                    str(_get_output_path(output_dir, deployment_extension)),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )

            if generate_result.stdout:
                print(generate_result.stdout)

            if generate_result.returncode:
                if "No such command" in generate_result.stdout:
                    raise Exception(
                        "Could not generate typed client, requires AlgoKit 2.0.0 or later. Please update AlgoKit"
                    )
                else:
                    raise Exception(
                        f"Could not generate typed client:\n{generate_result.stdout}"
                    )
    if client_file:
        return output_dir / client_file
    return output_dir


# --------------------------- Main Logic --------------------------- #


def main(action: str, contract_name: str | None = None) -> None:
    """Main entry point to build and/or deploy smart contracts."""
    artifact_path = root_path / "artifacts"
    # Filter contracts based on an optional specific contract name.
    filtered_contracts = [
        contract
        for contract in contracts
        if contract_name is None or contract.name == contract_name
    ]

    match action:
        case "build":
            for contract in filtered_contracts:
                logger.info(f"Building app at {contract.path}")
                build(artifact_path / contract.name, contract.path)
        case "deploy":
            for contract in filtered_contracts:
                output_dir = artifact_path / contract.name
                app_spec_file_name = next(
                    (
                        file.name
                        for file in output_dir.iterdir()
                        if file.is_file() and file.suffixes == [".arc56", ".json"]
                    ),
                    None,
                )
                if app_spec_file_name is None:
                    raise Exception("Could not deploy app, .arc56.json file not found")
                if contract.deploy:
                    logger.info(f"Deploying app {contract.name}")
                    contract.deploy()
        case "all":
            for contract in filtered_contracts:
                logger.info(f"Building app at {contract.path}")
                build(artifact_path / contract.name, contract.path)
                if contract.deploy:
                    logger.info(f"Deploying {contract.name}")
                    contract.deploy()
        case _:
            logger.error(f"Unknown action: {action}")


if __name__ == "__main__":
    if len(sys.argv) > 2:
        main(sys.argv[1], sys.argv[2])
    elif len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        main("all")
