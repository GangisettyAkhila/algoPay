"""
Deploy configuration for TaskEscrow contract
"""

from algokit_utils import (
    Account,
    ApplicationConfig,
    ApplicationStandard,
    OnSchemaBreak,
    UpdateExistingResource,
)


def deploy(
    version: str = "v1",
    deployer: Account = None,
    **kwargs,
) -> ApplicationConfig:
    """Deploy TaskEscrow contract."""

    return ApplicationConfig(
        app_name="TaskEscrow",
        schema={
            "global": {
                "creator": "address",
                "admin": "address",
                "task_count": "uint64",
            },
            "local": {},
        },
        deployer=deployer,
        templates={
            "VERSION": version,
        },
    )


# Deployment command:
# algokit deploy --network testnet --yes
#
# Or programmatically:
# from algokit import AlgorandClient
# client = AlgorandClient.testnet()
# client.deploy(TaskEscrow, deployer=account)
