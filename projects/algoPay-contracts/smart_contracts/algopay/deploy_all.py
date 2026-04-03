import logging

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    from smart_contracts.artifacts.algopay.agent_registry_client import (
        AgentRegistryFactory,
        AgentRegistryMethodCallCreateParams,
        BootstrapArgs as RegistryBootstrapArgs,
    )
    from smart_contracts.artifacts.algopay_payment_agent.payment_agent_client import (
        PaymentAgentFactory,
        PaymentAgentMethodCallCreateParams,
        BootstrapArgs as PaymentBootstrapArgs,
    )
    from smart_contracts.artifacts.algopay_task_manager.task_manager_client import (
        TaskManagerFactory,
        TaskManagerMethodCallCreateParams,
        BootstrapArgs as TaskBootstrapArgs,
    )

    # Deploy AgentRegistry
    logger.info("Deploying AgentRegistry...")
    registry_factory = algorand.client.get_typed_app_factory(
        AgentRegistryFactory, default_sender=deployer.address
    )
    registry_client, registry_result = registry_factory.deploy(
        create_params=AgentRegistryMethodCallCreateParams(
            args=RegistryBootstrapArgs(admin=deployer.address)
        ),
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    if registry_result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer.address,
                receiver=registry_client.app_address,
            )
        )
    logger.info(
        f"AgentRegistry deployed at App ID {registry_client.app_id} ({registry_client.app_address})"
    )

    # Deploy PaymentAgent
    logger.info("Deploying PaymentAgent...")
    payment_factory = algorand.client.get_typed_app_factory(
        PaymentAgentFactory, default_sender=deployer.address
    )
    payment_client, payment_result = payment_factory.deploy(
        create_params=PaymentAgentMethodCallCreateParams(
            args=PaymentBootstrapArgs(
                owner=deployer.address, agent_id="payment-agent-001"
            )
        ),
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    if payment_result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer.address,
                receiver=payment_client.app_address,
            )
        )
    logger.info(
        f"PaymentAgent deployed at App ID {payment_client.app_id} ({payment_client.app_address})"
    )

    # Deploy TaskManager
    logger.info("Deploying TaskManager...")
    task_factory = algorand.client.get_typed_app_factory(
        TaskManagerFactory, default_sender=deployer.address
    )
    task_client, task_result = task_factory.deploy(
        create_params=TaskManagerMethodCallCreateParams(
            args=TaskBootstrapArgs(owner=deployer.address)
        ),
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    if task_result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=5),
                sender=deployer.address,
                receiver=task_client.app_address,
            )
        )
    logger.info(
        f"TaskManager deployed at App ID {task_client.app_id} ({task_client.app_address})"
    )

    logger.info("=" * 60)
    logger.info("DEPLOYMENT SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Creator: {deployer.address}")
    logger.info(f"AgentRegistry: {registry_client.app_id}")
    logger.info(f"PaymentAgent:  {payment_client.app_id}")
    logger.info(f"TaskManager:   {task_client.app_id}")
