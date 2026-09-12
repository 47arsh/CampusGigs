import Task from "../models/Task.js";

const createTask = async (req, res) => {
    try {
        const {
            title,
            description,
            reward,
            pickupLocation,
            dropLocation
        } = req.body;

        const newTask = await Task.create({
            title,
            description,
            reward,
            pickupLocation,
            dropLocation,
            createdBy: req.user.userId
        });

        res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });

    } catch (error) {
        res.status(500).json({
            message: "Error creating task"
        });
    }
};

const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ status: "open" });

        res.status(200).json({
            message: "Tasks fetched successfully",
            tasks
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching tasks"
        });
    }
};

const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task fetched successfully",
            task
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching task"
        });
    }
};

export {
    createTask,
    getTasks,
    getTaskById
};