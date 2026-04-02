from algopy import (
    ARC4Contract,
    Account,
    BoxMap,
    String,
    Txn,
    UInt64,
    arc4,
)


class AgentRegistry(ARC4Contract):
    def __init__(self) -> None:
        self.admin = Account()
        self.agents = BoxMap(String, Account, key_prefix="agent_")
        self.metadata = BoxMap(String, String, key_prefix="meta_")
        self.agent_by_account = BoxMap(Account, String, key_prefix="acct_")
        self.agent_count = UInt64(0)

    @arc4.abimethod(create="allow")
    def bootstrap(self, admin: Account) -> None:
        self.admin = admin
        self.agent_count = UInt64(0)

    @arc4.abimethod()
    def register(self, agent_id: String, metadata_uri: String) -> None:
        assert agent_id not in self.agents, "Agent ID already registered"
        assert Txn.sender not in self.agent_by_account, "Account already registered"

        self.agents[agent_id] = Txn.sender
        self.metadata[agent_id] = metadata_uri
        self.agent_by_account[Txn.sender] = agent_id
        self.agent_count += UInt64(1)

    @arc4.abimethod()
    def update_metadata(self, agent_id: String, metadata_uri: String) -> None:
        assert agent_id in self.agents, "Agent ID not found"
        assert self.agents[agent_id] == Txn.sender, "Not the registered agent"

        self.metadata[agent_id] = metadata_uri

    @arc4.abimethod()
    def unregister(self, agent_id: String) -> None:
        assert agent_id in self.agents, "Agent ID not found"
        assert self.agents[agent_id] == Txn.sender, "Not the registered agent"

        del self.agent_by_account[Txn.sender]
        del self.agents[agent_id]
        del self.metadata[agent_id]
        self.agent_count -= UInt64(1)

    @arc4.abimethod(readonly=True)
    def lookup(self, agent_id: String) -> Account:
        assert agent_id in self.agents, "Agent ID not found"
        return self.agents[agent_id]

    @arc4.abimethod(readonly=True)
    def get_metadata(self, agent_id: String) -> String:
        assert agent_id in self.metadata, "Agent ID not found"
        return self.metadata[agent_id]

    @arc4.abimethod(readonly=True)
    def is_registered(self, agent_id: String) -> bool:
        return agent_id in self.agents

    @arc4.abimethod(readonly=True)
    def get_count(self) -> UInt64:
        return self.agent_count

    @arc4.abimethod(readonly=True)
    def is_agent(self, address: Account) -> bool:
        return address in self.agent_by_account
