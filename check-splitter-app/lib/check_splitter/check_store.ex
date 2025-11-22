defmodule CheckSplitter.CheckStore do
  @moduledoc """
  GenServer that manages check state using ETS.
  Provides concurrent access to checks with automatic cleanup.
  """

  use GenServer
  require Logger

  @table_name :checks
  @cleanup_interval :timer.hours(1)
  @check_ttl :timer.hours(24)

  # Client API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Creates a new check.
  """
  def create_check(owner_name) do
    check = CheckSplitter.Check.new(owner_name)
    :ets.insert(@table_name, {check.id, check})
    :ets.insert(@table_name, {check.share_code, check.id})
    {:ok, check}
  end

  @doc """
  Gets a check by ID.
  """
  def get_check(id) do
    case :ets.lookup(@table_name, id) do
      [{^id, check}] -> {:ok, check}
      [] -> {:error, :not_found}
    end
  end

  @doc """
  Gets a check by share code.
  """
  def get_check_by_share_code(share_code) do
    case :ets.lookup(@table_name, share_code) do
      [{^share_code, check_id}] -> get_check(check_id)
      [] -> {:error, :not_found}
    end
  end

  @doc """
  Updates a check.
  """
  def update_check(%CheckSplitter.Check{} = check) do
    :ets.insert(@table_name, {check.id, check})
    broadcast_update(check.id)
    {:ok, check}
  end

  @doc """
  Deletes a check.
  """
  def delete_check(id) do
    case get_check(id) do
      {:ok, check} ->
        :ets.delete(@table_name, id)
        :ets.delete(@table_name, check.share_code)
        :ok

      error ->
        error
    end
  end

  @doc """
  Subscribes to updates for a specific check.
  """
  def subscribe(check_id) do
    Phoenix.PubSub.subscribe(CheckSplitter.PubSub, "check:#{check_id}")
  end

  # Server Callbacks

  @impl true
  def init(_opts) do
    # Create ETS table
    :ets.new(@table_name, [:named_table, :set, :public, read_concurrency: true])

    # Schedule cleanup
    schedule_cleanup()

    Logger.info("CheckStore started with ETS table")
    {:ok, %{}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    cleanup_old_checks()
    schedule_cleanup()
    {:noreply, state}
  end

  # Private Functions

  defp broadcast_update(check_id) do
    Phoenix.PubSub.broadcast(
      CheckSplitter.PubSub,
      "check:#{check_id}",
      {:check_updated, check_id}
    )
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end

  defp cleanup_old_checks do
    cutoff = DateTime.add(DateTime.utc_now(), -@check_ttl, :millisecond)

    @table_name
    |> :ets.tab2list()
    |> Enum.each(fn
      {_key, %CheckSplitter.Check{} = check} ->
        if DateTime.compare(check.inserted_at, cutoff) == :lt do
          delete_check(check.id)
          Logger.info("Cleaned up old check: #{check.id}")
        end

      _ ->
        :ok
    end)
  end
end
