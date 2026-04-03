import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.algopay_agent_registry.agent_registry_client import (
        AgentRegistryFactory,
        AgentRegistryMethodCallCreateParams,
        BootstrapArgs,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        AgentRegistryFactory, default_sender=deployer.address
    )

    app_client, result = factory.deploy(
        create_params=AgentRegistryMethodCallCreateParams(
            args=BootstrapArgs(admin=deployer.address)
        ),
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer.address,
                receiver=app_client.app_address,
            )
        )
        logger.info(
            f"Deployed AgentRegistry at {app_client.app_id} ({app_client.app_address})"
        )
