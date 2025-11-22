defmodule CheckSplitter.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Telemetry supervisor
      CheckSplitterWeb.Telemetry,
      # PubSub for LiveView
      {Phoenix.PubSub, name: CheckSplitter.PubSub},
      # Check Store - our ETS-backed state management
      CheckSplitter.CheckStore,
      # Start the Endpoint
      CheckSplitterWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: CheckSplitter.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    CheckSplitterWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
